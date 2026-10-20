import { describe, it, expect } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { filterCatalog } from "../../src/modules/catalog/model";
import { referenceProduct } from "../../src/components/storefront/reference-product";
import type { Promotion } from "../../src/modules/commerce/promotions";

function fixture() {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  product.images = product.variants.map((variant, index) => ({
    id: `photo-${index}`,
    path: `photo-${index}.webp`,
    alt: `Frente ${variant.flavor}`,
    variantId: variant.id,
    position: index,
  }));
  return catalog;
}

describe("portada de prueba y catálogo real", () => {
  it("no fabrica un destacado si faltan fotos y no expone productos ocultos", () => {
    expect(referenceProduct(demoCatalog(), "https://media.test")).toBeNull();
    const catalog = fixture();
    catalog.products[0].active = false;
    expect(referenceProduct(catalog, "https://media.test")).toBeNull();
  });
  it("usa una presentación disponible, su foto, sus importes y el enlace al mismo SKU", () => {
    const catalog = fixture(),
      variant = catalog.products[0].variants[0];
    const selected = referenceProduct(catalog, "https://media.test")!;
    expect(selected.href).toContain(`variante=${variant.id}`);
    expect(selected.image.src).toContain("photo-0.webp");
    expect(selected.facts).toContainEqual({
      label: "Mercado Pago",
      value: "$ 45.000",
    });
    expect(selected.facts).toContainEqual({
      label: "Con transferencia",
      value: "$ 41.000",
    });
    expect(selected.description).toContain("Chocolate");
    expect(
      selected.facts.every(
        (fact) => !/BCAA|EAA|porción|sin gluten/.test(fact.label),
      ),
    ).toBe(true);
  });
  it("refleja una rebaja vigente sin anunciar un combo como precio individual", () => {
    const catalog = fixture(),
      variant = catalog.products[0].variants[0];
    const promotions: Promotion[] = [
      {
        id: "00000000-0000-4000-8000-000000000701",
        name: "Rebaja real",
        active: true,
        kind: "sale",
        components: [{ variantId: variant.id, quantity: 1 }],
        listPrice: 4000000,
        cashPrice: 3500000,
        startsAt: null,
        endsAt: null,
      },
    ];
    const selected = referenceProduct(
      catalog,
      "https://media.test",
      promotions,
    )!;
    expect(selected.facts[0].value).toBe("$ 40.000");
    expect(selected.facts[1].value).toBe("$ 35.000");
  });
  it("los objetivos filtran categorías existentes y se combinan con marca y stock", () => {
    const catalog = demoCatalog();
    expect(filterCatalog(catalog, { goal: "ganar-musculo" })).toHaveLength(2);
    expect(
      filterCatalog(catalog, {
        goal: "ganar-musculo",
        brand: catalog.brands[0].slug,
      }),
    ).toHaveLength(1);
    expect(
      filterCatalog(catalog, {
        goal: "rendir-mas",
        availability: "in-stock",
      }).map((item) => item.product.slug),
    ).toEqual(["creatina-de-prueba"]);
    expect(filterCatalog(catalog, { goal: "no-existe" })).toHaveLength(0);
  });
});
