import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

for (const mode of ["card", "detail"] as const) {
  test(`la etiqueta permanece opaca al cerrar el giro en ${mode}`, async ({
    page,
  }) => {
    // A transparent pack with an opaque white label exposes background bleed
    // during the handoff; checking animation names alone would miss the flash.
    const photos = await page.evaluate(() =>
      ["Banana", "Frutilla"].map((flavor) => {
        const canvas = document.createElement("canvas");
        canvas.width = 360;
        canvas.height = 480;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "white";
        context.fillRect(60, 20, 240, 440);
        context.fillStyle = flavor === "Banana" ? "#d8b474" : "#dd6677";
        context.fillRect(60, 20, 240, 30);
        return canvas.toDataURL("image/png");
      }),
    );
    const catalog = demoCatalog();
    const product = catalog.products[0];
    catalog.products = [product];
    product.slug = "whey-protein";
    product.variants = ["Banana", "Frutilla"].map((flavor, i) => ({
      ...product.variants[0],
      id: `00000000-0000-4000-8000-00000000007${i}`,
      sku: `HANDOFF-${i}`,
      flavor,
    }));
    product.images = product.variants.map((variant, i) => ({
      id: `00000000-0000-4000-8000-00000000008${i}`,
      path: `${product.id}/00000000-0000-4000-8000-00000000009${i}.png`,
      variantId: variant.id,
      position: i,
      alt: `Envase ${variant.flavor}`,
    }));
    const data = {
      catalog,
      images: Object.fromEntries(
        product.images.map((image, i) => [image.path, photos[i]]),
      ),
    };
    await page.addInitScript(
      (data) =>
        localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)),
      data,
    );
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.goto(
      mode === "card" ? "/vista-previa" : "/vista-previa/producto/whey-protein",
    );
    const gallery = page.locator(".product-image-gallery").first();
    await gallery.scrollIntoViewIfNeeded();
    await gallery
      .locator(".product-frame-current")
      .evaluate((image: HTMLImageElement) => image.decode());
    if (mode === "card") await page.clock.runFor(3100);
    else
      await page
        .getByRole("button", { name: "Sabor siguiente", exact: true })
        .click();
    await expect(gallery).toHaveAttribute("data-animated", "true");
    await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
      "alt",
      "Envase Frutilla",
    );
    await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
      "data-portrait",
      "true",
    );
    await expect(gallery.locator(".product-frame-settled")).toHaveAttribute(
      "data-portrait",
      "true",
    );

    for (const fraction of [0.8, 0.9, 0.99]) {
      await gallery.evaluate(
        (element, time) => {
          element.querySelectorAll("*").forEach((node) => {
            for (const animation of node.getAnimations()) {
              animation.pause();
              animation.currentTime = time;
            }
          });
        },
        (mode === "card" ? 900 : 660) * fraction,
      );
      const frame = await gallery
        .locator(".product-frame-settled")
        .boundingBox();
      const stage = gallery.locator(".product-image-stage");
      const bounds = await stage.boundingBox();
      const screenshot = await stage.screenshot({ scale: "css" });
      const pixel = await page.evaluate(
        async ({ photo, x, y }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${photo}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          return [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
        },
        {
          photo: screenshot.toString("base64"),
          x: Math.round(frame!.x + frame!.width / 2 - bounds!.x),
          y: Math.round(frame!.y + frame!.height / 2 - bounds!.y),
        },
      );
      expect(
        pixel.every((channel) => channel >= 250),
        `Etiqueta transparente en ${fraction * 100}%: ${pixel}`,
      ).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(gallery).not.toHaveAttribute("data-animated", "true");
    await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
      "alt",
      "Envase Frutilla",
    );
  });
}
