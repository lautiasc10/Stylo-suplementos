import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { readFileSync } from "node:fs";

test.beforeEach(async ({ page }, info) => {
  const catalog = demoCatalog();
  catalog.products = catalog.products.slice(0, 1);
  const product = catalog.products[0];
  if (info.tags.includes("@single-variant"))
    product.variants = product.variants.slice(0, 1);
  const images: Record<string, string> = {};
  product.images = [0, 1].map((index) => {
    const variant = product.variants[index % product.variants.length];
    const imageId = `00000000-0000-4000-8000-00000000070${index}`;
    const path = `${product.id}/${imageId}.webp`;
    const file = index
      ? "1e8c474c-0897-4451-97c2-038faf9259b6-ba539b39f4d6"
      : "1ee5a050-f660-42d0-9771-54535b2a8a37-eff70373188d";
    images[path] =
      `data:image/webp;base64,${readFileSync(`public/media/products-normalized-v1/${file}-v1-640.webp`).toString("base64")}`;
    return {
      id: imageId,
      path,
      alt: `Foto ${index}`,
      variantId: variant.id,
      position: index,
    };
  });
  await page.addInitScript(
    (data) => {
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
      const decoded: string[] = [];
      const original = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function () {
        decoded.push(this.src);
        return original.call(this);
      };
      Object.assign(window, {
        performanceDecoded: decoded,
        neighborSource: Object.values(data.images)[1],
      });
    },
    { catalog, images },
  );
});

test(
  "una galería de una variante también espera intención y se pausa bajo la bolsa",
  { tag: "@single-variant" },
  async ({ page }) => {
    await page.clock.install();
    await page.goto("/vista-previa");
    const gallery = page.locator(".product-image-gallery");
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toHaveAttribute("data-auto-playing", "true");
    await page.clock.runFor(800);
    expect(
      await page.evaluate(() => {
        const state = window as unknown as {
          performanceDecoded: string[];
          neighborSource: string;
        };
        return state.performanceDecoded.includes(state.neighborSource);
      }),
    ).toBe(false);
    const source = await gallery
      .locator(".product-frame-current")
      .getAttribute("src");
    await page.locator(".cart-trigger").dispatchEvent("click");
    await expect(page.locator("dialog:modal")).toBeVisible();
    await expect(gallery).not.toHaveAttribute("data-auto-playing", "true");
    await page.clock.runFor(7000);
    await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
      "src",
      source!,
    );
    await page.keyboard.press("Escape");
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  },
);

test("el catálogo espera intención para precargar sabores vecinos", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/vista-previa");
  const gallery = page.locator(".product-image-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  await expect
    .poll(() =>
      gallery
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await page.clock.runFor(800);
  const warmed = () =>
    page.evaluate(() => {
      const state = window as unknown as Window & {
        performanceDecoded: string[];
        neighborSource: string;
      };
      return state.performanceDecoded.includes(state.neighborSource);
    });
  expect(await warmed()).toBe(false);
  await gallery
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .focus();
  await page.clock.runFor(300);
  await expect.poll(warmed).toBe(true);
});

test("abrir la bolsa durante un giro lo finaliza sin dejar capas animándose detrás", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = original.call(this, frames, options);
      if (this.classList.contains("variant-spinner-frame")) animation.pause();
      return animation;
    };
  });
  await page.goto("/vista-previa");
  const gallery = page.locator(".product-image-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(3100);
  await expect(gallery).toHaveAttribute("data-spinner-phase", "outgoing");
  await page.locator(".cart-trigger").dispatchEvent("click");
  await expect(page.locator("dialog:modal")).toBeVisible();
  await expect(gallery).toHaveAttribute("data-spinner-phase", "idle");
  await expect(gallery.locator(".variant-spinner-frame")).toHaveCount(1);
});

for (const panel of ["bolsa", "buscador"] as const) {
  test(`las variantes se detienen detrás del ${panel} y retoman al cerrarlo`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto("/vista-previa");
    const gallery = page.locator(".product-image-gallery");
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toHaveAttribute("data-auto-playing", "true");
    const before = await gallery.getAttribute("data-active-variant");
    // Opening a hidden header action through its handler must not scroll the
    // gallery out of view and accidentally satisfy the pause assertion.
    await page
      .locator(panel === "bolsa" ? ".cart-trigger" : ".search-trigger")
      .dispatchEvent("click");
    await expect(page.locator("dialog:modal")).toBeVisible();
    await expect(gallery).not.toHaveAttribute("data-auto-playing", "true");
    await page.clock.runFor(7000);
    await expect(gallery).toHaveAttribute("data-active-variant", before!);
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog:modal")).toHaveCount(0);
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toHaveAttribute("data-auto-playing", "true");
    await page.clock.runFor(3100);
    await expect
      .poll(() => gallery.getAttribute("data-active-variant"))
      .not.toBe(before);
  });
}
