import { expect, test } from "@playwright/test";

test("el hero abre productos y permite saltar a categorías sin desbordar", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toContainText(
    "POTENCIÁ TU MEJOR VERSIÓN.",
  );
  await expect
    .poll(() =>
      hero
        .locator(".sport-hero-visual img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await hero.getByRole("link", { name: "Explorar categorías" }).click();
  await expect(page).toHaveURL(/#categorias$/);
  await expect(
    page.getByRole("heading", { name: /Tu rutina empieza acá/ }),
  ).toBeVisible();
  await hero.getByRole("link", { name: "Ver productos" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("el hero respeta movimiento reducido y conserva enlaces sin JavaScript", async ({
  page,
  browser,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".sport-hero-visual img")).toHaveCSS(
    "animation-name",
    "none",
  );
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  try {
    const plainPage = await context.newPage();
    await plainPage.goto(`${testInfo.project.use.baseURL}/`);
    await plainPage
      .locator(".sport-hero")
      .getByRole("link", { name: "Ver productos" })
      .click();
    await expect(plainPage).toHaveURL(/\/catalogo$/);
  } finally {
    await context.close();
  }
});
