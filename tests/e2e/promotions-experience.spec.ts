import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";
import type { Promotion } from "../../src/modules/commerce/promotions";

const catalog = demoCatalog();
catalog.products[1].variants[0].stock = 40;
const [protein, creatine] = [catalog.products[0].variants[0], catalog.products[1].variants[0]];
const shaker = catalog.products[3].variants[0];
const common = { active: true, startsAt: null, endsAt: null };
const images: Record<string, string> = {};
for (const [index, product] of catalog.products.entries()) {
  const id = `00000000-0000-4000-8000-00000000070${index}`;
  const path = `${product.id}/${id}.webp`;
  product.images = [{ id, path, alt: product.name, variantId: null, position: 0 }];
  images[path] = `data:image/webp;base64,${readFileSync(`public/media/products-normalized-v1/${index % 2 ? "1e8c474c-0897-4451-97c2-038faf9259b6-ba539b39f4d6" : "1ee5a050-f660-42d0-9771-54535b2a8a37-eff70373188d"}-v1-640.webp`).toString("base64")}`;
}
const promotions: Promotion[] = [
  { ...common, id: "11111111-1111-4111-8111-111111111111", name: "Rebaja de prueba", kind: "sale", components: [{ variantId: protein.id, quantity: 1 }], listPrice: 3400000, cashPrice: 3000000 },
  { ...common, id: "22222222-2222-4222-8222-222222222222", name: "Cantidad de prueba", kind: "quantity", components: [{ variantId: creatine.id, quantity: 15 }], listPrice: 2800000, cashPrice: 2400000 },
  { ...common, id: "33333333-3333-4333-8333-333333333333", name: "Combo de prueba", kind: "bundle", components: [{ variantId: protein.id, quantity: 1 }, { variantId: creatine.id, quantity: 1 }], listPrice: 6000000, cashPrice: 5000000 },
  { ...common, id: "44444444-4444-4444-8444-444444444444", name: "Accesorio de prueba", kind: "sale", components: [{ variantId: shaker.id, quantity: 1 }], listPrice: 900000, cashPrice: 800000 },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ catalog, promotions, images }) => {
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify({ catalog, images }));
    localStorage.setItem("stylo.promotions-preview.v1", JSON.stringify({ revision: 0, promotions }));
  }, { catalog, promotions, images });
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
  await scene.locator(".promo-feature").scrollIntoViewIfNeeded();
  await expect(scene.locator(".promo-feature-copy")).toHaveCSS("opacity", "1");
  await scene.locator(".promo-feature").screenshot({ path: testInfo.outputPath(`promotions-feature-${isMobile ? "mobile" : "desktop"}.png`), animations: "disabled" });
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
    const firstCard = section.locator(".promo-horizontal-card").first();
    const before = await firstCard.evaluate((el) => el.style.transform);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "instant" }));
    await expect.poll(() => firstCard.evaluate((el) => el.style.transform)).not.toBe(before);
    await firstCard.locator(".promo-horizontal-image").hover({ position: { x: 160, y: 100 } });
    await expect.poll(() => firstCard.locator(".promo-product-art").evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
    await expect(firstCard.locator(".product-artwork-reflection")).toHaveAttribute("aria-hidden", "true");
    const art = await firstCard.locator(".promo-product-art").boundingBox();
    const frame = await firstCard.locator(".promo-horizontal-image").boundingBox();
    expect(art && frame && art.height < frame.height).toBe(true);
    await expect.poll(() => firstCard.locator(".promo-horizontal-image").evaluate((el) => getComputedStyle(el, "::after").animationName)).toBe("promo-shine");
    const action = await section.locator(".promo-horizontal-card").first().locator(".promo-horizontal-actions").boundingBox();
    expect(action && action.y + action.height <= page.viewportSize()!.height).toBe(true);
    const viewport = await section.locator(".promo-horizontal-viewport").boundingBox();
    expect(action && viewport && action.y + action.height <= viewport.y + viewport.height).toBe(true);
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

test("Promociones y las particulas usan la tipografia y el dorado de la referencia", async ({ page }) => {
  await page.goto("/vista-previa/escena-promociones");
  await expect(page.locator(".promo-feature h2")).toBeVisible();
  const style = await page.evaluate(() => {
    const scene = document.querySelector(".promo-page")!;
    const particles = document.querySelector(".store-particles")!;
    const sample = document.createElement("span");
    sample.style.color = "oklch(0.78 0.15 70)";
    document.body.append(sample);
    const expectedGold = getComputedStyle(sample).color;
    sample.style.color = "var(--promo-reference-primary)";
    const gold = getComputedStyle(sample).color;
    sample.remove();
    const colorPixel = (color: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    return {
      gold: colorPixel(gold),
      expectedGold: colorPixel(expectedGold),
      bodyFont: getComputedStyle(scene).fontFamily,
      displayFont: getComputedStyle(scene.querySelector("h1")!).fontFamily,
      titleWeight: getComputedStyle(scene.querySelector(".promo-feature h2")!).fontWeight,
      buttonWeight: getComputedStyle(scene.querySelector(".promo-feature button")!).fontWeight,
      particleOpacity: getComputedStyle(particles).opacity,
      particleLayer: getComputedStyle(particles).zIndex,
      marqueeDuration: getComputedStyle(scene.querySelector(".promo-marquee > div")!).animationDuration,
    };
  });
  expect(style.gold).toEqual(style.expectedGold);
  expect(style.bodyFont).toContain("Barlow");
  expect(style.displayFont).toContain("Anton");
  expect(style.titleWeight).toBe("400");
  expect(style.buttonWeight).toBe("400");
  expect(style.particleOpacity).toBe("0.5");
  expect(style.particleLayer).toBe("10");
  expect(style.marqueeDuration).toBe("25s");
});
