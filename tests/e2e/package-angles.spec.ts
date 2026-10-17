import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

for (const mode of ["card", "detail"] as const) {
  test(`frentes por variante y fichas informativas sin tira de miniaturas en ${mode}`, async ({
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
    await page.goto(
      mode === "card"
        ? "/vista-previa?q=proteina"
        : `/vista-previa/producto/${product.slug}?variante=${first.id}`,
    );
    const gallery = page.locator(".variant-spinner");
    await gallery.scrollIntoViewIfNeeded();
    if (mode === "card") await page.locator(".product-card").hover();
    await gallery
      .getByRole("button", { name: "Sabor siguiente", exact: true })
      .click();
    await expect(gallery).toHaveAttribute("data-active-variant", next.id);
    await expect(gallery).toHaveAttribute("data-spinner-phase", "idle");
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
      await expect(gallery.locator(".product-thumbnail-rail")).toHaveCount(0);
      await expect(gallery).toHaveAttribute("data-active-variant", next.id);
      await page.locator(".product-information summary").click();
      await expect(page.locator(".product-information-grid a")).toContainText(
        "Tabla informativa",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gallery
        .getByRole("button", { name: "Sabor anterior", exact: true })
        .click();
      await expect(gallery).toHaveAttribute("data-active-variant", first.id);
      await expect(gallery).not.toHaveAttribute("data-inspecting", "true");
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
