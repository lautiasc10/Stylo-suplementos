import { describe, it, expect } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import {
  createSearchIndex,
  prepareSearch,
  highlightSearch,
} from "../../src/modules/catalog/search";

describe("búsqueda pública tolerante", () => {
  it("ignora tildes y mayúsculas y tolera transposiciones sin confundir términos cortos", () => {
    const search = prepareSearch(createSearchIndex(demoCatalog()));
    expect(search("PROTEÍNA").products[0].product.name).toBe(
      "Proteína de prueba",
    );
    expect(search("protiena").products[0].product.name).toBe(
      "Proteína de prueba",
    );
    expect(search("creatnia").products[0].product.name).toBe(
      "Creatina de prueba",
    );
    expect(search("preentreno").products[0].product.name).toBe(
      "Pre-entreno de prueba",
    );
    expect(search("zx").products).toEqual([]);
  });
  it("busca marca, categoría y sabor y vincula foto, stock y precio a la misma variante", () => {
    const catalog = demoCatalog(),
      product = catalog.products[0],
      variant = product.variants[1];
    product.images = [
      {
        id: "vanilla",
        path: "vainilla.webp",
        alt: "Vainilla",
        variantId: variant.id,
        position: 0,
      },
    ];
    const search = prepareSearch(
      createSearchIndex(catalog, "", { "vainilla.webp": "/vainilla.webp" }),
    );
    const result = search("proteina vainilla").products[0];
    expect(result.variant.id).toBe(variant.id);
    expect(result.variant.image).toBe("/vainilla.webp");
    expect(result.variant.stock).toBe(0);
    expect(result.variant.listPrice).toBe(4700000);
    expect(search("vainilla", { stock: true }).products).toEqual([]);
    expect(search("vainilla", { max: 4600000 }).products).toEqual([]);
    expect(
      search("marca prueba b").products.every(
        (p) => p.product.brand.slug === "marca-de-prueba-b",
      ),
    ).toBe(true);
    expect(search("shakers accesorios").products[0].product.name).toBe(
      "Shaker de prueba",
    );
  });
  it("respeta filtros combinados y no envía productos ocultos, SKU ni datos administrativos", () => {
    const catalog = demoCatalog();
    catalog.products[0].active = false;
    const index = createSearchIndex(catalog),
      search = prepareSearch(index);
    expect(index.products.some((p) => p.id === catalog.products[0].id)).toBe(
      false,
    );
    expect(JSON.stringify(index)).not.toContain("DEMO-");
    expect(
      search("", {
        category: "creatinas",
        stock: true,
        min: 3000000,
        max: 3300000,
      }).products,
    ).toHaveLength(1);
    expect(
      search("", { category: "creatinas", brand: "marca-de-prueba-a" })
        .products,
    ).toHaveLength(0);
    const ascending = search("", { sort: "price-asc" }).products.map(
      (p) => p.variant.listPrice,
    );
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
  });
  it("resalta el nombre original como texto y mantiene palabras con acentos", () => {
    const parts = highlightSearch("Proteína de prueba", "protiena");
    expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual([
      "Proteína",
    ]);
    expect(parts.map((p) => p.text).join("")).toBe("Proteína de prueba");
  });
});
