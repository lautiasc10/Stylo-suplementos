import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

for (const mode of ["card", "detail"] as const) {
  test(`vistas reales y cambio de SKU al volver al frente en ${mode}`, async ({
    page,
  }) => {
    const catalog = demoCatalog();
    const product = catalog.products[0];
    catalog.products = [product];
    product.variants = product.variants.slice(0, 2);
    product.variants[0].flavor = "Chocolate";
    product.variants[1].flavor = "Vainilla";
    const [first, next] = product.variants;
    const sources = await page.evaluate(() =>
      ["#fff", "#ddd", "#a86"].map((color) => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const context = canvas.getContext("2d")!;
        context.fillStyle = color;
        context.fillRect(100, 40, 200, 320);
        return canvas.toDataURL();
      }),
    );
    product.images = product.variants.map((v, i) => ({
      id: `00000000-0000-4000-8000-00000000010${i}`,
      path: `${product.id}/00000000-0000-4000-8000-00000000020${i}.png`,
      variantId: v.id,
      alt: `Frente ${v.flavor}`,
      position: i,
    }));
    product.turnImages = [
      {
        id: "00000000-0000-4000-8000-000000000301",
        path: `${product.id}/00000000-0000-4000-8000-000000000401.png`,
        variantId: null,
        alt: "Dorso real",
        position: 0,
        view: "back",
      },
    ];
    product.informationImages = [
      {
        id: "00000000-0000-4000-8000-000000000501",
        path: `${product.id}/00000000-0000-4000-8000-000000000601.png`,
        variantId: null,
        alt: "Tabla informativa",
        position: 0,
      },
    ];
    const images = Object.fromEntries([
      ...product.images.map((image, i) => [image.path, sources[i]]),
      [product.turnImages[0].path, sources[2]],
      [product.informationImages[0].path, sources[2]],
    ]);
    await page.addInitScript(
      (state) =>
        localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(state)),
      { catalog, images },
    );
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.goto(
      mode === "card"
        ? "/vista-previa?q=proteina"
        : `/vista-previa/producto/${product.slug}?variante=${first.id}`,
    );
    const gallery = page.locator(".product-image-gallery").first();
    await gallery.scrollIntoViewIfNeeded();
    await gallery
      .locator(".product-frame-current")
      .evaluate((el: HTMLImageElement) => el.decode());
    if (mode === "card") {
      await expect(gallery).toHaveAttribute("data-auto-playing", "true");
      await page.clock.runFor(3100);
    } else
      await gallery
        .getByRole("button", { name: "Sabor siguiente", exact: true })
        .click();
    await expect(gallery).toHaveAttribute("data-package-turn", "true");
    await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
      "alt",
      "Frente Chocolate",
    );
    const poses = gallery.locator(".package-turn img");
    await expect(poses).toHaveCount(3);
    expect(
      await poses.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            (node as HTMLImageElement).complete &&
            (node as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    ).toBe(true);
    if (mode === "card")
      await expect(page.locator(".product-card-action")).toHaveAttribute(
        "href",
        new RegExp(first.id),
      );
    else
      await expect(page.locator(".variant-picker")).toHaveAttribute(
        "data-selected-variant",
        first.id,
      );
    await poses.evaluateAll((nodes) =>
      nodes.forEach((node) =>
        node.getAnimations().forEach((animation) => animation.finish()),
      ),
    );
    await expect(gallery).not.toHaveAttribute("data-package-turn", "true");
    await expect(gallery.locator(".product-frame-current")).toHaveAttribute(
      "alt",
      "Frente Vainilla",
    );
    if (mode === "card")
      await expect(page.locator(".product-card-action")).toHaveAttribute(
        "href",
        new RegExp(next.id),
      );
    else {
      await expect(page.locator(".variant-picker")).toHaveAttribute(
        "data-selected-variant",
        next.id,
      );
      const rail = gallery.getByRole("group", {
        name: "Galería del producto",
        exact: true,
      });
      await rail
        .getByRole("link", { name: "Ver Dorso real", exact: true })
        .click();
      await expect(
        gallery.locator(".product-inspected-image img"),
      ).toHaveAttribute("alt", "Dorso real");
      await rail
        .getByRole("link", { name: "Ver Tabla informativa", exact: true })
        .click();
      await expect(gallery.locator(".product-inspected-image")).toHaveAttribute(
        "data-information",
        "true",
      );
      await expect(page.locator(".variant-picker")).toHaveAttribute(
        "data-selected-variant",
        next.id,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gallery
        .getByRole("button", { name: "Sabor anterior", exact: true })
        .click();
      await expect(gallery).not.toHaveAttribute("data-package-turn", "true");
      await expect(gallery).not.toHaveAttribute("data-inspecting", "true");
      await expect(page.locator(".variant-picker")).toHaveAttribute(
        "data-selected-variant",
        first.id,
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
