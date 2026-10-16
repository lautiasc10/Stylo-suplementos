import { expect, test } from "@playwright/test";

test("volver con el logo y recargar no repite la entrada", async ({ page }) => {
  const clips: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("stylo-scoop-intro")) clips.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-entrance-complete",
    "true",
  );
  const initialRequests = clips.length;
  await page
    .locator(".sport-hero")
    .getByRole("link", { name: "Explorar tienda", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await page.locator(".site-header .brand-link").click();
  await expect(page).toHaveURL(/\/#inicio$/);
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-presentation",
    "static",
  );
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  await page.reload();
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-presentation",
    "static",
  );
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  expect(clips.length).toBe(initialRequests);
});

test("el mate negro del león no oculta el fondo", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.addInitScript(() =>
    sessionStorage.setItem("stylo.home-intro-seen.v1", "1"),
  );
  await page.goto("/");
  const visual = page.locator(".sport-hero-visual");
  await expect(visual.locator("video")).toHaveClass(/is-ready/);
  await expect(visual).toHaveCSS("mix-blend-mode", "screen");
  await page.addStyleTag({
    content:
      ".sport-hero{background:rgb(72,48,16)} .hero-dust,.sport-hero-inner{visibility:hidden} .sport-hero-visual::after{background:none} .hero-lion-ambient{animation:none!important}",
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

test("la entrada comparte un reloj de 1,8 segundos con cascada de 100 ms", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero).toHaveAttribute("data-intro-start", /\d/);
  const at = async (time: number) => {
    const elapsed = await hero.evaluate(
      (element) =>
        performance.now() - Number((element as HTMLElement).dataset.introStart),
    );
    if (time > elapsed) await page.clock.runFor(time - elapsed);
  };
  await expect(hero).toHaveAttribute("data-lion-visible", "false");
  await expect(page.locator(".hero-intro-brand")).toHaveAttribute(
    "data-state",
    "visible",
  );
  await at(610);
  await expect(hero).toHaveAttribute("data-lion-visible", "true");
  for (let stage = 1; stage <= 5; stage++) {
    await at(1210 + (stage - 1) * 100);
    await expect(page.locator(".hero-content")).toHaveAttribute(
      "data-content-stage",
      String(stage),
    );
  }
  await at(1810);
  await expect(hero).toHaveAttribute("data-entrance-complete", "true");
  await expect(hero).toHaveAttribute("data-navigation", "ready");
  await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
  await expect(hero.locator(".hero-atmosphere,.hero-intro-brand")).toHaveCount(
    0,
  );
  await page.clock.runFor(250);
  await hero
    .getByRole("link", { name: "Explorar tienda", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalogo$/);
});

test("un video lento no alarga la entrada ni aparece tarde", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/stylo-scoop-intro-v3.mp4", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/");
    const hero = page.locator(".sport-hero");
    await expect(hero).toHaveAttribute("data-entrance-complete", "true", {
      timeout: 2500,
    });
    const duration = await hero.evaluate(
      (element) =>
        performance.now() - Number((element as HTMLElement).dataset.introStart),
    );
    expect(duration).toBeLessThan(2150);
    await expect(hero.locator(".hero-atmosphere")).toHaveCount(0);
    await expect(
      hero.getByRole("link", { name: "Explorar tienda", exact: true }),
    ).toBeVisible();
    release();
    await page.waitForTimeout(150);
    await expect(hero.locator(".hero-atmosphere")).toHaveCount(0);
  } finally {
    release();
  }
});

test("respiración y partículas se pausan juntas y el CTA tiene destello accesible", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero).toHaveAttribute("data-entrance-complete", "true");
  const ambient = hero.locator(".hero-lion-ambient");
  await expect(ambient).toHaveCSS("animation-name", "hero-lion-breathe");
  await expect(ambient).toHaveCSS("animation-duration", "6s");
  await page.getByRole("button", { name: "Pausar polvo del fondo" }).click();
  await expect(ambient).toHaveCSS("animation-play-state", "paused");
  await expect(hero).toHaveAttribute("data-ambient-paused", "true");
  const primary = hero.getByRole("link", {
    name: "Explorar tienda",
    exact: true,
  });
  await primary.hover();
  expect(
    await primary.evaluate(
      (element) => getComputedStyle(element, "::after").animationName,
    ),
  ).toBe("hero-button-shimmer");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(ambient).toHaveCSS("animation-name", "none");
  await expect(hero.locator("canvas,video")).toHaveCount(0);
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
  await hero.getByRole("link", { name: "Ver destacados" }).click();
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
  await page.mouse.move(width * 0.7, 300);
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
    await expect(page.locator(".hero-content")).toHaveAttribute(
      "data-content-stage",
      "5",
    );
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
  await page.mouse.move(width * 0.6, 300);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(2.23, 1);
  await video.evaluate((element) => {
    const media = element as HTMLVideoElement & { presented: number[] };
    media.presented = [];
    media.addEventListener("seeked", () =>
      media.presented.push(media.currentTime),
    );
  });
  for (let step = 1; step <= 40; step++) {
    await page.mouse.move(width * (0.6 + step * 0.005), 300);
    await page.waitForTimeout(35);
  }
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeLessThan(1.65);
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
  await page.mouse.move(width * 0.67, 300);
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
    await page.mouse.move(width * (0.67 + step * 0.000375), 300);
    await page.waitForTimeout(35);
  }
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeLessThan(1.91);
  const frames = await video.evaluate(
    (element) =>
      (element as HTMLVideoElement & { slowFrames: number[] }).slowFrames,
  );
  expect(new Set(frames).size).toBeGreaterThan(12);
  for (let i = 1; i < frames.length; i++) {
    expect(frames[i]).toBeLessThanOrEqual(frames[i - 1] + 0.001);
    expect(frames[i - 1] - frames[i]).toBeLessThan(0.032);
  }
  await page.mouse.move(width * 0.7, 300);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(2, 1);
});
