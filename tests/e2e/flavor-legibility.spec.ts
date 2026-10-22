import { expect, test, type Page } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { tmpdir } from "node:os";
import { join } from "node:path";

const flavors = [
  ["Banana", "banana"],
  ["Frutilla", "frutilla"],
  ["Vainilla", "vainilla"],
  ["Chocolate", "chocolate"],
  ["Cookies", "cookies"],
  ["Dulce de leche", "dulce"],
  ["Frutos rojos", "frutos-rojos"],
  ["Citrus", "citrus"],
  ["Limón", "limon"],
  ["Uva", "uva"],
  ["Sandía", "sandia"],
  ["Ananá", "anana"],
  ["Naranja", "naranja"],
  ["Pomelo", "pomelo"],
  ["Cereza", "cereza"],
  ["Multifruta", "multifruta"],
] as const;

async function seed(page: Page) {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  catalog.products = [product];
  catalog.brands[0].name = "One Fit Nutrition";
  product.variants = flavors.map(([flavor], i) => ({
    ...product.variants[0],
    id: `00000000-0000-4000-8000-${String(700 + i).padStart(12, "0")}`,
    sku: `CONTRASTE-${i}`,
    flavor,
    stock: 0,
  }));
  await page.addInitScript((data) => {
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
  }, { catalog, images: {} });
  await page.emulateMedia({ reducedMotion: "reduce" });
  return product;
}

test("todos los fondos mantienen enlace, información y estado agotado legibles", async ({
  page,
  isMobile,
}) => {
  const product = await seed(page);
  await page.setViewportSize({
    width: isMobile ? 390 : 1440,
    height: isMobile ? 844 : 900,
  });
  for (const [index, [, theme]] of flavors.entries()) {
    const variant = product.variants[index];
    await page.goto(
      `/vista-previa/producto/${product.slug}?variante=${variant.id}`,
    );
    const hero = page.locator(".flavor-product-detail");
    await expect(hero).toHaveAttribute("data-flavor", theme);
    const back = hero.getByRole("link", { name: /Volver a la tienda/ });
    await expect(back).toBeVisible();
    await expect(back).toHaveCSS("min-height", "44px");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.locator(".product-information summary")).toContainText(
      "Información del producto",
    );
    const unavailable = hero.getByRole("button", { name: "Sin stock", exact: true });
    await expect(unavailable).toBeDisabled();
    await expect(unavailable).toHaveCSS("opacity", "1");
    const selected = hero.locator('.gainer-flavor-options a[aria-current="true"]');
    await expect(selected).toHaveAttribute("data-unavailable", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.STYLO_CAPTURE && [0, 1, 8, 9].includes(index)) {
      await page.screenshot({
        path: join(tmpdir(), `stylo-3ab-${theme}-${isMobile ? "mobile" : "desktop"}.png`),
        fullPage: true,
      });
    }
  }
});
