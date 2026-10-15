import { expect, test } from "@playwright/test";

test("el hero conserva accesos y muestra un fotograma mientras carga", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
    "Bienvenido a STYLO SUPLEMENTOS",
  );
  await expect(hero).toContainText("Una nueva experiencia está por comenzar.");
  await expect(hero).toContainText("Potenciá tu mejor versión.");
  await expect
    .poll(() =>
      hero
        .locator(".sport-hero-visual img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(hero.getByRole("link", { name: "Conocé STYLO" })).toHaveAttribute(
    "href",
    "/nosotros",
  );
  if (testInfo.project.name === "mobile") {
    await expect(hero.locator("video")).toHaveCount(0);
  }
  await hero.getByRole("link", { name: "Ver productos destacados" }).click();
  await expect(page).toHaveURL(/#categorias$/);
  await expect(
    page.getByRole("heading", { name: /Tu rutina empieza acá/ }),
  ).toBeVisible();
  await hero.getByRole("link", { name: "Explorar tienda" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("el mouse recorre el video en ambos sentidos y el video queda pausado", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "El celular muestra un fotograma fijo",
  );
  await page.goto("/");
  const video = page.locator(".sport-hero video");
  await expect(video).toHaveClass(/is-ready/, { timeout: 15000 });
  const initial = await video.evaluate(
    (element) => (element as HTMLVideoElement).currentTime,
  );
  await page.mouse.move(250, 300);
  await page.mouse.move(850, 300);
  await expect
    .poll(async () =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(initial + 0.1);
  const advanced = await video.evaluate(
    (element) => (element as HTMLVideoElement).currentTime,
  );
  await page.mouse.move(270, 300);
  await expect
    .poll(async () =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeLessThan(advanced - 0.1);
  await expect(video).toHaveJSProperty("paused", true);
});

test("movimiento reducido y navegación sin JavaScript conservan el hero", async ({
  page,
  browser,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".sport-hero video")).toHaveCount(0);
  await expect(page.locator(".hero-typewriter")).toHaveText(
    "Potenciá tu mejor versión.",
  );
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  try {
    const plainPage = await context.newPage();
    await plainPage.goto(`${testInfo.project.use.baseURL}/`);
    await expect(plainPage.locator(".sport-hero video")).toHaveCount(0);
    await expect(plainPage.locator(".hero-typewriter-static")).toHaveText(
      "Potenciá tu mejor versión.",
    );
    await plainPage
      .locator(".sport-hero")
      .getByRole("link", { name: "Explorar tienda" })
      .click();
    await expect(plainPage).toHaveURL(/\/catalogo$/);
  } finally {
    await context.close();
  }
});
