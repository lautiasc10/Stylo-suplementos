import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("la roca permanece fija y los envases normalizados comparten tamaño y línea base", async ({
  page,
}) => {
  await page.addInitScript((catalog) => {
    const product = catalog.products[0];
    catalog.products = [product];
    const images: Record<string, string> = {};
    product.images = [220, 600].map((width, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1000;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#ece9e1";
      context.fillRect((1000 - width) / 2, 100, width, 800);
      const path = `${product.id}/00000000-0000-4000-8000-00000000020${index}.png`;
      images[path] = canvas.toDataURL("image/png");
      return {
        id: `00000000-0000-4000-8000-00000000010${index}`,
        path,
        variantId: product.variants[index].id,
        position: index,
        alt: index ? "Bolsa normalizada" : "Frasco normalizado",
      };
    });
    localStorage.setItem(
      "stylo.catalog-preview.v1",
      JSON.stringify({ catalog, images }),
    );
  }, demoCatalog());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa?q=proteina");
  const gallery = page.locator(".variant-spinner");
  await gallery.scrollIntoViewIfNeeded();
  await page.locator(".product-card").hover();
  const measure = () =>
    gallery.locator(".product-frame-current").evaluate((el) => {
      const image = el as HTMLImageElement,
        rect = image.getBoundingClientRect(),
        stage = image.closest(".product-image-stage")!.getBoundingClientRect();
      return {
        gap: (stage.bottom - (rect.top + rect.height * 0.9)) / stage.width,
        width: rect.width / stage.width,
        height: rect.height / stage.height,
        background: getComputedStyle(image.closest(".product-image-stage")!)
          .backgroundImage,
      };
    });
  const first = await measure();
  expect(first.gap).toBeCloseTo(0.1, 2);
  expect(first.width).toBeCloseTo(1, 2);
  expect(first.height).toBeCloseTo(1, 2);
  await gallery
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Bolsa normalizada",
  );
  await expect(gallery).toHaveAttribute("data-spinner-phase", "idle");
  const next = await measure();
  expect(next.gap).toBeCloseTo(0.1, 2);
  expect(next.width).toBeCloseTo(1, 2);
  expect(next.height).toBeCloseTo(1, 2);
  expect(next.background).toBe(first.background);
});
