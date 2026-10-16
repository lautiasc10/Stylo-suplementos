import { describe, it, expect } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { navigationCategories } from "../../src/components/storefront/navigation-model";

describe("productos públicos del mega menú", () => {
  it("selecciona una variante comprable y su propia foto, sin mostrar otra presentación", () => {
    const catalog = demoCatalog();
    const product = catalog.products[0];
    product.variants[0].stock = 0;
    product.variants[1].stock = 4;
    product.images = [
      {
        id: "front-a",
        path: "chocolate.webp",
        alt: "Chocolate",
        variantId: product.variants[0].id,
        position: 0,
      },
      {
        id: "front-b",
        path: "vanilla.webp",
        alt: "Vainilla",
        variantId: product.variants[1].id,
        position: 1,
      },
    ];
    const menu = navigationCategories(
      catalog,
      "https://example.supabase.co/storage/v1/object/public/product-media",
    );
    const item = menu.find((c) => c.slug === "proteinas")!.products![0];
    expect(item.variant.id).toBe(product.variants[1].id);
    expect(item.variantLabel).toContain("Vainilla");
    expect(item.image).toContain("vanilla.webp");
    expect(item.image).not.toContain("chocolate.webp");
  });

  it("excluye productos y marcas ocultas, y limita las tarjetas de cada categoría", () => {
    const catalog = demoCatalog();
    const product = catalog.products[0];
    catalog.products = Array.from({ length: 8 }, (_, i) => ({
      ...product,
      id: `product-${i}`,
      slug: `product-${i}`,
      featured: i === 7,
      active: i !== 1,
    }));
    const menu = navigationCategories(catalog, "").find(
      (c) => c.slug === "proteinas",
    )!.products!;
    expect(menu).toHaveLength(3);
    expect(menu[0].id).toBe("product-7");
    expect(menu.some((p) => p.id === "product-1")).toBe(false);
    catalog.brands[0].active = false;
    expect(
      navigationCategories(catalog, "").find((c) => c.slug === "proteinas")!
        .products,
    ).toEqual([]);
  });
});
