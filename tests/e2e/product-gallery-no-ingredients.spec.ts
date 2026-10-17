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

test("cambiar de sabor conserva el envase animado sin cargar ingredientes", async ({
  page,
}) => {
  await seed(page);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto("/vista-previa?q=proteina");
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const card = page.locator(".product-card");
  await card.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 0",
  );
  const measureLayout = () =>
    card.evaluate((node) => {
      const box = node.getBoundingClientRect();
      // Scroll and the existing reveal transform can move viewport coordinates;
      // compare layout positions to catch a pack-induced resize or layout shift.
      let x = 0,
        y = 0;
      for (
        let element: HTMLElement | null = node;
        element;
        element = element.offsetParent as HTMLElement | null
      ) {
        x += element.offsetLeft;
        y += element.offsetTop;
      }
      return {
        width: box.width,
        height: box.height,
        x,
        y,
      };
    });
  const before = await measureLayout();
  await page.clock.runFor(3100);
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 1",
  );
  await page.clock.runFor(3100);
  await expect(card.locator(".product-card-marker")).toHaveText("Frutilla");
  await expect(card.locator(".product-image-gallery")).toHaveAttribute(
    "data-transition",
    "turn",
  );
  await expect(card.locator(".product-frame-pair")).toHaveCSS(
    "animation-name",
    "product-photo-turn",
  );
  await expect(card.locator(".product-image-fragments")).toHaveCount(0);
  expect(await measureLayout()).toEqual(before);
  await expect(page.locator(".flavor-ingredients")).toHaveCount(0);
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
  await expect(page.locator(".flavor-ingredients")).toHaveCount(0);
  expect(requests.some((url) => url.includes("/sabores/"))).toBe(false);
});

test("el giro automático recorre frente y dorso, termina y deja una pausa entre fotos", async ({
  page,
}) => {
  await seed(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card");
  const gallery = card.locator(".product-image-gallery");
  await gallery.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  const dimensions = () =>
    gallery.evaluate((e) => ({ width: e.clientWidth, height: e.clientHeight }));
  const before = await dimensions();
  await page.clock.runFor(2900);
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 0",
  );
  await expect(gallery).not.toHaveAttribute("data-animated", "true");
  await page.clock.runFor(200);
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 1",
  );
  await expect(card.locator(".product-frame-pair")).toHaveCSS(
    "animation-name",
    "product-photo-turn",
  );
  await expect(card.locator(".product-frame-outgoing")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(card.locator(".product-card-marker")).toHaveText("Banana");
  expect(await dimensions()).toEqual(before);
  await page.clock.runFor(1000);
  await expect(card.locator(".product-frame-outgoing")).toHaveCount(0);
  await expect(card.locator(".product-frame-pair")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.clock.runFor(1000);
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 1",
  );
  await page.clock.runFor(1100);
  await expect(card.locator(".product-card-marker")).toHaveText("Frutilla");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(gallery).not.toHaveAttribute("data-animated", "true");
  await expect(card.locator(".product-frame-pair")).toHaveCSS(
    "transform",
    "none",
  );
  await page.clock.runFor(12000);
  await expect(card.locator(".product-card-marker")).toHaveText("Frutilla");
});

test("si la siguiente foto falla, el giro conserva imagen, sabor y enlace actuales", async ({
  page,
}) => {
  const data = fixture();
  const product = data.catalog.products[0];
  data.images[product.images[1].path] = "data:image/webp;base64,broken";
  await seed(page, data);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card");
  await card.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await expect(card.locator(".product-image-gallery")).toHaveAttribute(
    "data-auto-playing",
    "true",
  );
  await page.clock.runFor(3100);
  await expect(card.locator(".gallery-message")).toContainText(
    "No pudimos cargar esta imagen",
  );
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 0",
  );
  await expect(card.locator(".product-card-marker")).toHaveText("Banana");
  await expect(card.locator(".product-card-action")).toHaveAttribute(
    "href",
    new RegExp(`variante=${product.variants[0].id}$`),
  );
  await expect(card.locator(".product-image-gallery")).not.toHaveAttribute(
    "data-animated",
    "true",
  );
  await page.clock.runFor(12000);
  await expect(card.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto de prueba Banana 0",
  );
});
