import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("la piedra es común y las bases se alinean sin aumentar el tamaño de frascos y bolsas", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.addInitScript((catalog) => {
    const product = catalog.products[0];
    catalog.products = [product];
    product.variants.forEach((variant) => {
      variant.flavor = "Chocolate";
    });
    const images: Record<string, string> = {};
    const shapes = [
      [800, 400, 280, 40, 240, 300],
      [400, 800, 90, 180, 220, 480],
    ];
    product.images = shapes.map((shape, index) => {
      const [width, height, x, y, bodyWidth, bodyHeight] = shape;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#ece9e1";
      context.fillRect(x, y, bodyWidth, bodyHeight);
      const path = `${product.id}/00000000-0000-4000-8000-00000000020${index}.png`;
      images[path] = canvas.toDataURL("image/png");
      return {
        id: `00000000-0000-4000-8000-00000000010${index}`,
        path,
        variantId: product.variants[index].id,
        position: index,
        alt: index ? "Bolsa de prueba" : "Frasco de prueba",
      };
    });
    localStorage.setItem(
      "stylo.catalog-preview.v1",
      JSON.stringify({ catalog, images }),
    );
  }, demoCatalog());
  await page.goto("/vista-previa?q=proteina");
  const gallery = page.locator(".product-image-gallery");
  await gallery.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  const image = gallery.locator(".product-frame-current");
  const measure = (sourceBottom: number) =>
    image.evaluate((el, bottom) => {
      const image = el as HTMLImageElement;
      const rect = image.getBoundingClientRect();
      const stage = image
        .closest(".product-image-stage")!
        .getBoundingClientRect();
      const fittedHeight = Math.min(
        1,
        image.naturalHeight / image.naturalWidth,
      );
      const visibleBottom =
        rect.top +
        rect.height * ((1 - fittedHeight) / 2 + fittedHeight * bottom);
      return {
        gap: (stage.bottom - visibleBottom) / stage.width,
        frameWidth: rect.width / stage.width,
        frameHeight: rect.height / stage.width,
        stageHeight: stage.height / stage.width,
        background: getComputedStyle(image.closest(".product-image-stage")!)
          .backgroundPosition,
      };
    }, sourceBottom);
  await expect(image).toHaveAttribute("alt", "Frasco de prueba");
  await expect
    .poll(() =>
      image.evaluate((e) => e.style.getPropertyValue("--product-photo-y")),
    )
    .not.toBe("");
  const bottle = await measure(340 / 400);
  expect(bottle.gap).toBeGreaterThan(0.19);
  expect(bottle.gap).toBeLessThan(0.23);
  expect(bottle.frameWidth).toBeCloseTo(1, 2);
  expect(bottle.frameHeight).toBeCloseTo(1, 2);
  expect(bottle.stageHeight).toBeCloseTo(1.25, 2);
  await page.clock.runFor(3100);
  await expect(image).toHaveAttribute("alt", "Bolsa de prueba");
  await page.clock.runFor(1000);
  await expect(gallery).not.toHaveAttribute("data-animated", "true");
  const bag = await measure(660 / 800);
  expect(bag.gap).toBeGreaterThan(0.19);
  expect(bag.gap).toBeLessThan(0.23);
  expect(bag.frameWidth).toBeCloseTo(1.4, 2);
  expect(bag.frameHeight).toBeCloseTo(1.4, 2);
  expect(bag.background).toEqual(bottle.background);
});
