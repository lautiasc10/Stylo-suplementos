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

test("envases con márgenes diferentes se centran y apoyan en la misma superficie", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.addInitScript((data) => {
    const product = data.catalog.products[0];
    product.variants[0].flavor = "Chocolate";
    product.images = product.images.slice(0, 2);
    const shapes = [
      [800, 400, 280, 40, 240, 300],
      [400, 800, 90, 180, 220, 480],
    ];
    product.images.forEach((image, index) => {
      const [width, height, x, y, bodyWidth, bodyHeight] = shapes[index];
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#ece9e1";
      context.fillRect(x, y, bodyWidth, bodyHeight);
      data.images[image.path] = canvas.toDataURL("image/png");
    });
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
  }, fixture());
  await page.goto("/vista-previa?q=proteina");
  const image = page.locator(".product-frame-current");
  await image.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await expect(image).toHaveAttribute("data-on-stone", "true");
  const position = (bodyBottom: number, bodyCenter: number) =>
    image.evaluate(
      (el, body) => {
        const rect = el.getBoundingClientRect();
        const stage = el
          .closest(".product-image-stage")!
          .getBoundingClientRect();
        return {
          bottom:
            (rect.top - stage.top + rect.height * body.bottom) / stage.height,
          center:
            (rect.left - stage.left + rect.width * body.center) / stage.width,
          naturalAspect:
            (el as HTMLImageElement).naturalWidth /
            (el as HTMLImageElement).naturalHeight,
          displayAspect: rect.width / rect.height,
        };
      },
      { bottom: bodyBottom, center: bodyCenter },
    );
  const first = await position(340 / 400, 400 / 800);
  expect(first.bottom).toBeGreaterThan(0.78);
  expect(first.bottom).toBeLessThan(0.83);
  expect(first.center).toBeCloseTo(0.5, 1);
  expect(first.displayAspect).toBeCloseTo(first.naturalAspect, 1);
  await page.clock.runFor(3100);
  await expect(image).toHaveAttribute("alt", "Foto de prueba Banana 1");
  await expect(image).toHaveAttribute("data-on-stone", "true");
  const second = await position(660 / 800, 200 / 400);
  expect(second.bottom).toBeGreaterThan(0.78);
  expect(second.bottom).toBeLessThan(0.83);
  expect(second.center).toBeCloseTo(0.5, 1);
  expect(second.displayAspect).toBeCloseTo(second.naturalAspect, 1);
});
