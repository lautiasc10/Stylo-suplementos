import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

for (const mode of ["card", "detail"] as const) {
  test(`el pack conserva el mismo nodo, resolución y etiqueta opaca al cerrar ${mode === "card" ? "el giro" : "el fundido"} en ${mode}`, async ({
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
    await page.goto(
      mode === "card" ? "/vista-previa" : "/vista-previa/producto/whey-protein",
    );
    const gallery = page.locator(".variant-spinner");
    await gallery.scrollIntoViewIfNeeded();
    if (mode === "card") await page.locator(".product-card").hover();
    await gallery
      .getByRole("button", { name: "Sabor siguiente", exact: true })
      .click();
    await expect(gallery).toHaveAttribute("data-spinner-phase", "incoming");
    await gallery.evaluate((e) =>
      e
        .querySelectorAll(".variant-spinner-frame")
        .forEach((f) => f.getAnimations().forEach((a) => a.pause())),
    );
    const photo = gallery.locator(".product-frame-current");
    await expect(photo).toHaveAttribute("alt", "Envase Frutilla");
    const src = await photo.evaluate((img: HTMLImageElement) => {
      (window as Window & { spinnerFrame?: HTMLImageElement }).spinnerFrame =
        img;
      return img.currentSrc;
    });
    expect(
      await photo.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    ).toBe(true);
    await gallery.evaluate((e) =>
      e
        .querySelectorAll(".variant-spinner-frame")
        .forEach((f) => f.getAnimations().forEach((a) => a.finish())),
    );
    await expect(gallery).toHaveAttribute("data-spinner-phase", "idle");
    expect(
      await photo.evaluate(
        (img: HTMLImageElement) =>
          img ===
          (window as Window & { spinnerFrame?: HTMLImageElement }).spinnerFrame,
      ),
    ).toBe(true);
    expect(
      await photo.evaluate((img: HTMLImageElement) => img.currentSrc),
    ).toBe(src);
    const stage = gallery.locator(".product-image-stage");

    await stage.scrollIntoViewIfNeeded();
    const frame = (await photo.boundingBox())!,
      bounds = (await stage.boundingBox())!;
    const screenshot = await stage.screenshot({
      scale: "css",
      path: test.info().outputPath("settled.png"),
    });
    const pixel = await page.evaluate(
      async ({ photo, x, y }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${photo}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3);
      },
      {
        photo: screenshot.toString("base64"),
        x: Math.round(frame.x + frame.width / 2 - bounds.x),
        y: Math.round(frame.y + frame.height / 2 - bounds.y),
      },
    );
    expect(
      pixel.every((channel) => channel >= 250),
      `La etiqueta debe quedar opaca y nítida: ${pixel}`,
    ).toBe(true);
  });
}
