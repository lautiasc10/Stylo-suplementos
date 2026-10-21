import { expect, test } from "@playwright/test";

test("el hero de la referencia usa Anton y Manrope y conserva la identidad de la cabecera", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hero-title")).toHaveCSS("font-family", /Anton/);
  await expect(page.locator(".hero-title")).toHaveCSS("font-weight", "400");
  await expect(page.locator(".hero-actions")).toHaveCSS(
    "font-family",
    /Manrope/,
  );
  await expect(page.locator(".hero-subtitle")).toHaveCount(0);
  await expect(page.locator(".site-header")).toHaveCSS("font-family", /Inter/);
});

test("la prueba centra el león delante de la frase y deja las acciones debajo del escenario", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const title = await page.locator(".hero-title").boundingBox();
  const actions = await page.locator(".hero-actions").boundingBox();
  const lion = await page.locator(".sport-hero-visual").boundingBox();
  expect(title).not.toBeNull();
  expect(actions).not.toBeNull();
  expect(lion).not.toBeNull();
  expect(title!.x + title!.width / 2).toBeCloseTo(
    page.viewportSize()!.width / 2,
    0,
  );
  expect(lion!.x + lion!.width / 2).toBeCloseTo(
    page.viewportSize()!.width / 2,
    0,
  );
  expect(actions!.y).toBeGreaterThan(title!.y + title!.height);
  expect(lion!.x + lion!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("la frase sigue al cursor en sentido inverso y se detiene al pausar", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await expect(page.locator(".reference-lion-poses")).toHaveAttribute(
    "data-left-ready",
    "true",
  );
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
  await page.route("**/stylo-lion-poster-left-v1.webp", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".sport-hero-poster")).toBeVisible();
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
    await page.locator(".sport-hero .hero-pill-primary").click();
    await expect(page).toHaveURL(/\/catalogo$/);
  } finally {
    release();
  }
});

test("la luz acompaña el cursor y la pausa detiene luz, partículas y carrusel", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero.locator(".reference-lion-poses")).toHaveAttribute(
    "data-left-ready",
    "true",
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
  await expect(visual.locator(".reference-lion-poses")).toHaveAttribute(
    "data-left-ready",
    "true",
  );
  await expect(visual).toHaveCSS("mix-blend-mode", "normal");
  await expect(visual).toHaveCSS("mask-image", /radial-gradient/);
  await page.addStyleTag({
    content:
      ".sport-hero{background:rgb(72,48,16)} .hero-dust,.hero-title,.hero-cursor-light,.sport-hero-inner{visibility:hidden} .sport-hero::after{background:none} .sport-hero-visual::after{background:none} .hero-lion-ambient{animation:none!important}",
  });
  const root = await page.locator(".sport-hero").boundingBox();
  const media = await visual.locator(".reference-lion-right").boundingBox();
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

test("el hero conserva accesos y muestra un fotograma mientras carga", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
    "Potenciá tu mejor versión.",
  );
  await expect(hero.locator(".hero-subtitle")).toHaveCount(0);
  await expect(hero).toContainText("Potenciá tu mejor versión.");
  await expect
    .poll(() =>
      hero
        .locator(".sport-hero-visual img")
        .first()
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
      await expect(
        plainPage.getByRole("navigation", {
          name: "Categorías de la tienda",
          exact: true,
        }),
      ).toBeVisible();
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
