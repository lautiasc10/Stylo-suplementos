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

test("ingredientes y envase cambian por separado, sin cambiar medidas ni fondo", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card");
  await card.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  const current = (flavor: string) =>
    card.locator(
      `.flavor-ingredient-layer[data-flavor="${flavor}"]:not([data-outgoing])`,
    );
  await expect(current("banana")).toHaveAttribute("data-ready", "true");
  await expect(card.locator(".flavor-ingredients")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  const measure = () =>
    card.evaluate((e) => ({
      width: e.clientWidth,
      height: e.clientHeight,
      background: getComputedStyle(e.querySelector(".product-image-stage")!)
        .backgroundImage,
    }));
  const before = await measure();
  await page.clock.runFor(3100); // Another photo of the same flavor does not restart its ingredients.
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 1",
  );
  await expect(current("banana")).toHaveAttribute("data-sequence", "0");
  await expect(
    card.locator(".flavor-ingredient-layer[data-outgoing]"),
  ).toHaveCount(0);
  await page.clock.runFor(3100);
  await expect(current("frutilla")).toHaveAttribute("data-ready", "true");
  await expect(
    card.locator(
      '.flavor-ingredient-layer[data-outgoing][data-flavor="banana"]',
    ),
  ).toHaveCount(1);
  await expect(card.locator(".product-image-fragments")).toHaveCount(1);
  await expect(card.locator(".product-card-marker")).toHaveText("Frutilla");
  expect(await measure()).toEqual(before);
  await page.clock.runFor(900);
  await expect(
    card.locator(".flavor-ingredient-layer[data-outgoing]"),
  ).toHaveCount(0);
  await page.clock.runFor(2200);
  await expect(current("vainilla")).toHaveAttribute("data-ready", "true");
  await page.clock.runFor(900);
  await page.clock.runFor(2200);
  await expect(card.locator(".product-card-marker")).toHaveText("Chocolate");
  await page.clock.runFor(900);
  await expect(card.locator(".flavor-ingredients")).toHaveCount(0);
});

test("el selector conserva salida anterior, limita capas y responde a movimiento reducido", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const product = fixture().catalog.products[0];
  await page.goto(`/vista-previa/producto/${product.slug}`);
  const select = page.getByLabel("Presentación", { exact: true });
  await expect(
    page.locator('.flavor-ingredient-layer[data-flavor="banana"]'),
  ).toHaveAttribute("data-ready", "true");
  await select.selectOption(product.variants[1].id);
  await expect(
    page.locator(
      '.flavor-ingredient-layer[data-outgoing][data-flavor="banana"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('.flavor-ingredient-layer[data-flavor="frutilla"]'),
  ).toHaveAttribute("data-ready", "true");
  await select.selectOption(product.variants[2].id);
  await select.selectOption(product.variants[0].id);
  await expect(page.locator(".flavor-ingredient-layer")).toHaveCount(2);
  await expect(
    page.locator(".flavor-ingredient-layer[data-outgoing]"),
  ).toHaveCount(1);
  await expect(page.locator(".flavor-ingredients img")).toHaveCount(4);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.locator(".flavor-ingredient-layer[data-outgoing]"),
  ).toHaveCount(0);
  await expect(page.locator(".flavor-ingredient-piece").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await select.selectOption(product.variants[3].id);
  await expect(page.locator(".flavor-ingredients")).toHaveCount(0);
  await expect(select).toHaveValue(product.variants[3].id);
});

test("un fallo decorativo conserva foto, selección y navegación", async ({
  page,
}) => {
  await page.route("**/sabores/frutilla-decor-v1.webp", (route) =>
    route.abort(),
  );
  const product = fixture().catalog.products[0];
  await page.goto(
    `/vista-previa/producto/${product.slug}?variante=${product.variants[1].id}`,
  );
  await expect(page.locator(".product-frame-current")).toBeVisible();
  await expect(page.getByLabel("Presentación", { exact: true })).toHaveValue(
    product.variants[1].id,
  );
  await expect(
    page.locator('.flavor-ingredient-layer[data-ready="true"]'),
  ).toHaveCount(0);
  await page
    .getByLabel("Presentación", { exact: true })
    .selectOption(product.variants[2].id);
  await expect(
    page.locator('.flavor-ingredient-layer[data-flavor="vainilla"]'),
  ).toHaveAttribute("data-ready", "true");
});

test("sin JavaScript el catálogo conserva la foto y no pide decoraciones", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(`${baseURL}/vista-previa`);
  await expect(page.locator(".flavor-ingredients")).toHaveCount(0);
  expect(requests.some((url) => url.includes("/sabores/"))).toBe(false);
  await context.close();
});
