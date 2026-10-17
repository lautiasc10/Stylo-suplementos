import { test, expect, type Page } from "@playwright/test";
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

async function seed(page: Page, data = fixture()) {
  await page.addInitScript(
    (data) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)),
    data,
  );
}

test("cambiar de variante conserva el envase independiente y no carga ingredientes en tarjetas", async ({
  page,
}) => {
  await seed(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card"),
    gallery = card.locator(".variant-ring");
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  const before = await card.evaluate((e) => [e.clientWidth, e.clientHeight]);
  await gallery
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(card.locator(".product-card-marker-current")).toHaveText(
    "Frutilla",
  );
  await expect(gallery).toHaveAttribute("data-ring-phase", "idle");
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Frutilla 2",
  );
  expect(await card.evaluate((e) => [e.clientWidth, e.clientHeight])).toEqual(
    before,
  );
  await expect(card.locator(".product-image-fragments")).toHaveCount(0);
  expect(requests.some((url) => url.includes("/sabores/"))).toBe(false);
  const product = fixture().catalog.products[0];
  await page.goto("/vista-previa/producto/" + product.slug);
  await page
    .locator(`.variant-chip[href="?variante=${product.variants[2].id}"]`)
    .click();
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Vainilla Ice Cream 3",
  );
  expect(requests.some((url) => url.includes("/sabores/"))).toBe(false);
});

test("el autoplay cambia solo frentes de variantes, limpia capas y pausa con foco y movimiento reducido", async ({
  page,
}) => {
  await seed(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto("/vista-previa?q=proteina");
  const gallery = page.locator(".variant-ring");
  await gallery.scrollIntoViewIfNeeded();
  await gallery.dispatchEvent("pointerover", { pointerType: "mouse" });
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(3800);
  // Native Motion timelines use real compositor time; finish their visual pass
  // after advancing the mocked autoplay timer, without changing application state.
  await page.waitForTimeout(50);
  await page
    .locator(".variant-ring")
    .evaluateAll((roots) =>
      roots.forEach((root) =>
        root
          .querySelectorAll("*")
          .forEach((node) => node.getAnimations().forEach((a) => a.finish())),
      ),
    );
  await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Frutilla 2",
  );
  await expect(gallery).toHaveAttribute("data-ring-phase", "idle");
  await page.clock.runFor(200);
  await expect(gallery.locator(".variant-ring-item")).toHaveCount(3);
  await gallery.locator(".product-frame-link").focus();
  await expect(gallery).not.toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(6000);
  await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Frutilla 2",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gallery.locator(".product-frame-link").evaluate((e) => e.blur());
  await page.clock.runFor(6000);
  await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Frutilla 2",
  );
});

test("si la siguiente foto falla, el giro conserva imagen, sabor y enlace actuales", async ({
  page,
}) => {
  const data = fixture();
  data.images[data.catalog.products[0].images[2].path] =
    "data:image/webp;base64,broken";
  await seed(page, data);
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card"),
    gallery = card.locator(".variant-ring");
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  const href = await card.locator(".product-card-action").getAttribute("href");
  await gallery
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(gallery.locator(".gallery-message")).toContainText(
    "No pudimos cargar esta imagen",
  );
  await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 0",
  );
  await expect(card.locator(".product-card-action")).toHaveAttribute(
    "href",
    href!,
  );
  await expect(card.locator(".product-card-marker-current")).toHaveText(
    "Banana",
  );
});
