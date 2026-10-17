import { expect, test } from "@playwright/test";

test("las fuentes de la referencia quedan limitadas al hero", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hero-title")).toHaveCSS("font-family", /Anton/);
  await expect(page.locator(".hero-title")).toHaveCSS("font-weight", "400");
  await expect(page.locator(".hero-subtitle")).toHaveCSS(
    "font-family",
    /Manrope/,
  );
  await expect(page.locator(".site-header")).toHaveCSS("font-family", /Inter/);
});

test("la frase sigue al cursor en sentido inverso y se detiene al pausar", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await expect(page.locator(".sport-hero-visual video")).toHaveClass(/is-ready/);
  const title = page.locator(".hero-title-parallax");
  const position = () =>
    title.evaluate((e) => {
      const t = new DOMMatrix(getComputedStyle(e).transform);
      return { x: t.m41, y: t.m42 };
    });
  const width = page.viewportSize()!.width;
  await page.mouse.move(width * 0.1, 240);
  await expect.poll(async () => (await position()).x).toBeGreaterThan(8);
  await page.mouse.move(width * 0.9, 500);
  await expect.poll(async () => (await position()).x).toBeLessThan(-8);
  await page.getByRole("button", { name: "Pausar animación del hero" }).click();
  const frozen = await position();
  await page.mouse.move(width * 0.1, 250);
  await page.waitForTimeout(150);
  expect(await position()).toEqual(frozen);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => (await position()).x).toBe(0);
});

test("el hero abre sin splash y volver con el logo no lo reinicia", async ({
  page,
}) => {
  const scoop: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("stylo-scoop")) scoop.push(r.url());
  });
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero).toHaveAttribute("data-navigation", "ready");
  await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
  await expect(hero.locator(".hero-atmosphere,.hero-intro-brand")).toHaveCount(
    0,
  );
  await hero
    .getByRole("link", { name: "Explorar tienda", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await page.locator(".site-header .brand-link").click();
  await expect(page).toHaveURL(/\/#inicio$/);
  await expect(hero).toHaveAttribute("data-presentation", "static");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  await page.reload();
  await expect(hero).toHaveAttribute("data-presentation", "static");
  expect(scoop).toEqual([]);
});

test("una carga lenta del león conserva póster, navegación y compra disponibles", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  let release = () => {};
  const gate = new Promise<void>((r) => {
    release = r;
  });
  await page.route("**/stylo-lion-motion-v3.mp4", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/");
    await expect(page.locator(".sport-hero-poster")).toBeVisible();
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
    await page.locator(".hero-pill-primary").click();
    await expect(page).toHaveURL(/\/catalogo$/);
  } finally {
    release();
  }
});

test("el error del video conserva la foto y no interrumpe las acciones", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.route("**/stylo-lion-motion-v3.mp4", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".sport-hero-visual video")).toHaveCount(0);
  await expect(page.locator(".sport-hero-poster")).toBeVisible();
  await page.locator(".hero-pill-primary").click();
  await expect(page).toHaveURL(/\/catalogo$/);
});

test("la luz acompaña el cursor y la pausa detiene luz, partículas y carrusel", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero.locator("video")).toHaveClass(/is-ready/);
  await expect(hero.locator(".sport-hero-poster")).toHaveCSS(
    "visibility",
    "hidden",
  );
  const light = hero.locator(".hero-cursor-light");
  await page.mouse.move(300, 350);
  await expect(light).toHaveAttribute("data-active", "true");
  await page.waitForTimeout(400);
  const before = await light.evaluate((e) => e.style.transform);
  await page.mouse.move(800, 450);
  await expect
    .poll(() => light.evaluate((e) => e.style.transform))
    .not.toBe(before);
  const track = hero.locator(".hero-marquee-track");
  await expect(track).toHaveCSS("animation-name", "hero-marquee-drift");
  const widths = await hero
    .locator(".hero-marquee-group")
    .evaluateAll((groups) =>
      groups.map((g) => g.getBoundingClientRect().width),
    );
  expect(widths[0]).toBeCloseTo(widths[1], 1);
  await hero.getByRole("button", { name: "Pausar animación del hero" }).click();
  await expect(hero).toHaveAttribute("data-ambient-paused", "true");
  await expect(track).toHaveCSS("animation-play-state", "paused");
  await expect(hero.locator(".hero-lion-ambient")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  const frozen = await light.evaluate((e) => e.style.transform);
  await page.mouse.move(500, 300);
  await page.waitForTimeout(150);
  expect(await light.evaluate((e) => e.style.transform)).toBe(frozen);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero.locator("video,canvas")).toHaveCount(0);
  await expect(track).toHaveCSS("animation-name", "none");
});

test("el carrusel permite navegar con teclado y conserva enlaces sin movimiento", async ({
  page,
}, info) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", {
    name: "Categorías de la tienda",
    exact: true,
  });
  const link = nav.getByRole("link", { name: "Proteína", exact: true });
  await expect(link).toHaveCount(1);
  await link.focus();
  await expect(link).toBeFocused();
  await expect(nav.locator(".hero-marquee-track")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/catalogo\?categoria=proteinas$/);
});

test("las categorías repetidas del carrusel también se pueden pulsar", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero).toHaveAttribute("data-enhanced", "true");
  await hero.locator(".hero-marquee-track").evaluate((track) => {
    const animation = track.getAnimations()[0];
    animation.currentTime = 57000;
    animation.pause();
  });
  await hero
    .locator('.hero-marquee-group[aria-hidden="true"] a')
    .first()
    .click();
  await expect(page).toHaveURL(/\/catalogo\?categoria=proteinas$/);
});

test("el mate negro del león no oculta el fondo", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.addInitScript(() =>
    sessionStorage.setItem("stylo.home-intro-seen.v1", "1"),
  );
  await page.goto("/");
  const visual = page.locator(".sport-hero-visual");
  await expect(visual.locator("video")).toHaveClass(/is-ready/);
  await expect(visual).toHaveCSS("mix-blend-mode", "normal");
  await expect(visual).toHaveCSS("mask-image", /radial-gradient/);
  await page.addStyleTag({
    content:
      ".sport-hero{background:rgb(72,48,16)} .hero-dust,.hero-title,.hero-cursor-light,.sport-hero-inner{visibility:hidden} .sport-hero::after{background:none} .sport-hero-visual::after{background:none} .hero-lion-ambient{animation:none!important}",
  });
  const root = await page.locator(".sport-hero").boundingBox();
  const media = await visual.locator("video").boundingBox();
  const png = await page.locator(".sport-hero").screenshot();
  const rgb = await page.evaluate(
    async ({ source, x, y }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${source}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      return [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
    },
    {
      source: png.toString("base64"),
      x: Math.round(media!.x + media!.width * 0.12 - root!.x),
      y: Math.round(media!.y + media!.height * 0.5 - root!.y),
    },
  );
  for (const [i, value] of [72, 48, 16].entries())
    expect(Math.abs(rgb[i] - value)).toBeLessThan(6);
});

test("el decoder conserva respaldo si se omite un callback", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.addInitScript(() => {
    sessionStorage.setItem("stylo.home-intro-seen.v1", "1");
    HTMLVideoElement.prototype.requestVideoFrameCallback = () => 1;
    HTMLVideoElement.prototype.cancelVideoFrameCallback = () => {};
  });
  await page.goto("/");
  const lion = page.locator(".sport-hero-visual video");
  await expect(lion).toHaveClass(/is-ready/);
  await page.mouse.move(page.viewportSize()!.width * 0.05, 300);
  await expect
    .poll(() =>
      lion.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(3);
});

test("el hero conserva accesos y muestra un fotograma mientras carga", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
    "Potenciá tu mejor versión.",
  );
  await expect(hero).toContainText("Proteínas, creatinas y pre-entrenos");
  await expect(hero).toContainText("Potenciá tu mejor versión.");
  await expect
    .poll(() =>
      hero
        .locator(".sport-hero-visual img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(hero.getByRole("link", { name: "Conocé STYLO" })).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    await expect(hero.locator("video")).toHaveCount(0);
  }
  await hero.getByRole("link", { name: "Destacados" }).click();
  await expect(page).toHaveURL(/#destacados$/);
  await expect(
    page.getByRole("heading", { name: "Productos destacados" }),
  ).toBeVisible();
  await hero.getByRole("link", { name: "Explorar tienda" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("la mirada sigue la posición del cursor y vuelve al mismo fotograma", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "El celular muestra un fotograma fijo",
  );
  await page.goto("/");
  const video = page.locator(".sport-hero-visual video");
  await expect(video).toHaveClass(/is-ready/, { timeout: 15000 });
  await page.keyboard.press("Tab");
  const width = page.viewportSize()!.width;
  const currentTime = () =>
    video.evaluate((element) => (element as HTMLVideoElement).currentTime);
  const duration = await video.evaluate(
    (element) => (element as HTMLVideoElement).duration,
  );
  await page.mouse.move(width * 0.1, 300);
  await expect.poll(currentTime).toBeGreaterThan(duration * 0.7);
  await page.mouse.move(width * 0.95, 300);
  await expect.poll(currentTime).toBeLessThan(duration * 0.3);
  // Absolute positioning must not drift after a quick reversal.
  await page.mouse.move(width * 0.15, 300);
  await page.mouse.move(width * 0.85, 300);
  await page.mouse.move(width * 0.5, 300);
  await expect.poll(currentTime).toBeCloseTo(duration / 2, 1);
  await expect(video).toHaveJSProperty("paused", true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveCount(0);
  await expect(page.locator(".hero-dust canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".sport-hero-visual video")).toHaveClass(
    /is-ready/,
  );
  await expect(page.locator(".hero-dust canvas")).toBeVisible();
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-presentation",
    "static",
  );
});

test("movimiento reducido y navegación sin JavaScript conservan el hero", async ({
  page,
  browser,
}, testInfo) => {
  const atmosphereRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("stylo-scoop-"))
      atmosphereRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".sport-hero video")).toHaveCount(0);
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
  await expect(page.locator(".hero-title")).toHaveText(
    "Potenciá tu mejor versión.",
  );
  expect(atmosphereRequests).toEqual([]);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  try {
    const plainPage = await context.newPage();
    await plainPage.goto(`${testInfo.project.use.baseURL}/`);
    await expect(plainPage.locator(".sport-hero video")).toHaveCount(0);
    await expect(plainPage.locator(".site-header")).toBeVisible();
    await expect(plainPage.locator(".site-header")).not.toHaveAttribute(
      "inert",
    );
    if (testInfo.project.name === "desktop")
      await expect(plainPage.locator(".category-navigation")).toBeVisible();
    else await expect(plainPage.locator(".mobile-menu summary")).toBeVisible();
    await expect(plainPage.locator(".hero-title")).toHaveText(
      "Potenciá tu mejor versión.",
    );
    await plainPage
      .locator(".sport-hero")
      .getByRole("link", { name: "Explorar tienda" })
      .click();
    await expect(plainPage).toHaveURL(/\/catalogo$/);
    await plainPage.locator(".site-header .brand-link").click();
    await expect(plainPage).toHaveURL(/\/#inicio$/);
    await expect.poll(() => plainPage.evaluate(() => scrollY)).toBeLessThan(2);
    await expect(plainPage.locator(".hero-actions a").first()).toBeVisible();
  } finally {
    await context.close();
  }
});

test("Tab antes de hidratar conserva la navegación accesible", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    await page
      .getByRole("link", { name: "Saltar al contenido" })
      .waitFor({ state: "attached" });
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Saltar al contenido" }),
    ).toBeFocused();
    release();
    await expect(page.locator(".sport-hero")).toHaveAttribute(
      "data-presentation",
      "static",
    );
    await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  } finally {
    release();
  }
});

test("el cruce frontal sigue presentando fotogramas sin cambios de sentido", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "El seguimiento utiliza mouse");
  await page.goto("/");
  const video = page.locator(".sport-hero-visual video");
  await expect(video).toHaveClass(/is-ready/);
  await page.keyboard.press("Tab");
  const width = page.viewportSize()!.width;
  await page.mouse.move(width * 0.4, 300);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(2.29, 1);
  await video.evaluate((element) => {
    const media = element as HTMLVideoElement & { presented: number[] };
    media.presented = [];
    media.addEventListener("seeked", () =>
      media.presented.push(media.currentTime),
    );
  });
  for (let step = 1; step <= 40; step++) {
    await page.mouse.move(width * (0.4 + step * 0.005), 300);
    await page.waitForTimeout(35);
  }
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeLessThan(1.75);
  const frames = await video.evaluate(
    (element) =>
      (element as HTMLVideoElement & { presented: number[] }).presented,
  );
  // Parallel browser load may coalesce destinations; the frontal pose must
  // still be presented between the two sides, rather than skipped.
  expect(frames.some((time) => Math.abs(time - 2.02) < 0.07)).toBe(true);
  for (let i = 1; i < frames.length; i++) {
    expect(frames[i]).toBeLessThanOrEqual(frames[i - 1] + 0.001);
    expect(frames[i - 1] - frames[i]).toBeLessThan(0.2);
  }
});

test("la mirada lenta atraviesa el frente con poses intermedias", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "El seguimiento utiliza mouse");
  await page.goto("/");
  const video = page.locator(".sport-hero-visual video");
  await expect(video).toHaveClass(/is-ready/);
  await page.keyboard.press("Tab");
  const width = page.viewportSize()!.width;
  await page.mouse.move(width * 0.47, 300);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(2.05);
  await page.waitForTimeout(400);
  await video.evaluate((element) => {
    const media = element as HTMLVideoElement & { slowFrames: number[] };
    media.slowFrames = [];
    media.addEventListener("seeked", () =>
      media.slowFrames.push(media.currentTime),
    );
  });
  // Just six percent of the viewport over almost six seconds: the previous
  // 24 fps clip held only five poses during this same slow central sweep.
  for (let step = 1; step <= 160; step++) {
    await page.mouse.move(width * (0.47 + step * 0.000375), 300);
    await page.waitForTimeout(35);
  }
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeLessThan(1.94);
  const frames = await video.evaluate(
    (element) =>
      (element as HTMLVideoElement & { slowFrames: number[] }).slowFrames,
  );
  expect(new Set(frames).size).toBeGreaterThan(12);
  for (let i = 1; i < frames.length; i++) {
    expect(frames[i]).toBeLessThanOrEqual(frames[i - 1] + 0.001);
    expect(frames[i - 1] - frames[i]).toBeLessThan(0.032);
  }
  await page.mouse.move(width * 0.5, 300);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(2, 1);
});
