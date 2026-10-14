import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

function fixture() {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  catalog.products = [product];
  const first = product.variants[0];
  product.variants = [
    "Banana",
    "Frutilla",
    "Vainilla Ice Cream",
    "Chocolate",
  ].map((flavor, index) => ({
    ...first,
    id: `00000000-0000-4000-8000-00000000005${index}`,
    sku: `TEST-INGREDIENT-${index}`,
    flavor,
  }));
  const payloads = [
    "logo-principal.webp",
    "logo-horizontal.webp",
    "logo-completo.webp",
  ].map(
    (name) =>
      `data:image/webp;base64,${readFileSync(`public/branding/${name}`).toString("base64")}`,
  );
  product.images = [0, 0, 1, 2, 3].map((variant, index) => ({
    id: `00000000-0000-4000-8000-00000000010${index}`,
    path: `${product.id}/00000000-0000-4000-8000-00000000020${index}.webp`,
    variantId: product.variants[variant].id,
    position: index,
    alt: `Foto de prueba ${product.variants[variant].flavor} ${index}`,
  }));
  return {
    catalog,
    images: Object.fromEntries(
      product.images.map((image, index) => [
        image.path,
        payloads[index % payloads.length],
      ]),
    ),
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (data) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)),
    fixture(),
  );
});

test("cambiar de sabor conserva el envase animado sin cargar ingredientes", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card");
  await card.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 0",
  );
  const before = await card.boundingBox();
  await page.clock.runFor(3100);
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 1",
  );
  await page.clock.runFor(3100);
  await expect(card.locator(".product-card-marker")).toHaveText("Frutilla");
  await expect(card.locator(".product-image-fragments")).toHaveCount(1);
  expect(await card.boundingBox()).toEqual(before);
  await expect(page.locator(".flavor-ingredients")).toHaveCount(0);
  expect(requests.some((url) => url.includes("/sabores/"))).toBe(false);
  const product = fixture().catalog.products[0];
  await page.goto("/vista-previa/producto/" + product.slug);
  await page
    .getByLabel("Presentación", { exact: true })
    .selectOption(product.variants[2].id);
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Vainilla Ice Cream 3",
  );
  await expect(page.locator(".flavor-ingredients")).toHaveCount(0);
  expect(requests.some((url) => url.includes("/sabores/"))).toBe(false);
});
