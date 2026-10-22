import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import type { Promotion } from "../../src/modules/commerce/promotions";

const catalog = demoCatalog();
catalog.products[1].variants[0].stock = 40;
const [protein, creatine] = [catalog.products[0].variants[0], catalog.products[1].variants[0]];
const shaker = catalog.products[3].variants[0];
const common = { active: true, startsAt: null, endsAt: null };
const promotions: Promotion[] = [
  { ...common, id: "11111111-1111-4111-8111-111111111111", name: "Rebaja de prueba", kind: "sale", components: [{ variantId: protein.id, quantity: 1 }], listPrice: 3400000, cashPrice: 3000000 },
  { ...common, id: "22222222-2222-4222-8222-222222222222", name: "Cantidad de prueba", kind: "quantity", components: [{ variantId: creatine.id, quantity: 15 }], listPrice: 2800000, cashPrice: 2400000 },
  { ...common, id: "33333333-3333-4333-8333-333333333333", name: "Combo de prueba", kind: "bundle", components: [{ variantId: protein.id, quantity: 1 }, { variantId: creatine.id, quantity: 1 }], listPrice: 6000000, cashPrice: 5000000 },
  { ...common, id: "44444444-4444-4444-8444-444444444444", name: "Accesorio de prueba", kind: "sale", components: [{ variantId: shaker.id, quantity: 1 }], listPrice: 900000, cashPrice: 800000 },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ catalog, promotions }) => {
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify({ catalog, images: {} }));
    localStorage.setItem("stylo.promotions-preview.v1", JSON.stringify({ revision: 0, promotions }));
  }, { catalog, promotions });
});

test("la página independiente muestra solo promociones comprables y agrega un combo completo", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa/escena-promociones");
  const scene = page.locator(".promo-page");
  await expect(scene.locator(".promo-horizontal-card")).toHaveCount(4);
  await expect(scene.locator(".promo-bundle")).toHaveCount(1);
  await expect(scene.getByRole("heading", { name: "Promociones STYLO" })).toBeVisible();
  await expect(scene.locator(".promo-hero h1")).toContainText("−29%");
  await expect(page.locator("canvas.store-particles")).toHaveCount(1);
  await expect(scene.locator(".promo-horizontal-card").first().locator(".promo-horizontal-price strong")).toHaveText("$ 30.000");
  await scene.locator(".promo-bundle").getByRole("button", { name: "Agregar promoción Combo de prueba a la bolsa" }).click();
  await expect(scene.locator(".promo-bundle").getByRole("button", { name: "Agregar promoción Combo de prueba a la bolsa" })).toContainText("Agregado");
  await expect(page.getByRole("link", { name: /Abrir carrito, 2 unidades/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await scene.screenshot({ path: testInfo.outputPath(`promotions-${isMobile ? "mobile" : "desktop"}.png`), animations: "disabled" });
  expect(errors).toEqual([]);
});

test("el recorrido horizontal responde al scroll y conserva el movimiento reducido", async ({ page, isMobile }, testInfo) => {
  await page.goto("/vista-previa/escena-promociones");
  const section = page.locator(".promo-horizontal");
  await expect(section.locator(".promo-horizontal-card")).toHaveCount(4);
  if (!isMobile) {
    await expect(section).toHaveAttribute("data-enhanced", "true");
    await page.evaluate(() => document.querySelector(".promo-horizontal")?.scrollIntoView({ behavior: "instant" }));
    await page.evaluate(() => window.scrollBy({ top: 100, behavior: "instant" }));
    await expect.poll(() => section.locator(".promo-horizontal-track").evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
    const action = await section.locator(".promo-horizontal-card").first().locator(".promo-horizontal-actions").boundingBox();
    expect(action && action.y + action.height <= page.viewportSize()!.height).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("promotions-rail-desktop.png"), animations: "disabled" });
  } else {
    await expect(section).toHaveAttribute("data-enhanced", "false");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section).toHaveAttribute("data-enhanced", "false");
  await expect.poll(() => section.locator(".promo-horizontal-track").evaluate((el) => el.style.transform)).toBe("");
});

test("sin JavaScript se lee la portada y se puede entrar a la tienda", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/promociones`);
  await expect(page.getByRole("heading", { name: "Promociones STYLO" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tienda", exact: true }).first()).toHaveAttribute("href", "/catalogo");
  await context.close();
});

test("una sola capa de partículas acompaña las páginas públicas", async ({ page }) => {
  for (const path of ["/", "/catalogo", "/nosotros", "/promociones", "/vista-previa/producto/proteina-de-prueba"]) {
    await page.goto(path);
    await expect(page.locator("canvas.store-particles")).toHaveCount(1);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("canvas.store-particles")).toHaveCount(1);
});

test("la página conserva títulos y compra dentro del ancho en 320, 375, 768 y 1024px", async ({ page }) => {
  for (const width of [320, 375, 768, 1024]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto("/vista-previa/escena-promociones");
    await expect(page.locator(".promo-feature form button")).toBeVisible();
    const bounds = await page.locator(".promo-hero h1").boundingBox();
    expect(bounds && bounds.x + bounds.width <= width + 1).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});
