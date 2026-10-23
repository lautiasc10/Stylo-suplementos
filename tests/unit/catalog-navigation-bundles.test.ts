import { describe, expect, it } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { catalogReturnHref, productHref, safeShopReturn } from "../../src/modules/catalog/navigation";
import { availableBundles, matchingBundles } from "../../src/modules/commerce/catalog-bundles";
import type { Promotion } from "../../src/modules/commerce/promotions";

const catalog = demoCatalog();
const combo: Promotion = { id: "22222222-2222-4222-8222-222222222222", name: "Crea + proteína", kind: "bundle", active: true,
  components: [catalog.products[0], catalog.products[1]].map((p) => ({ variantId: p.variants[0].id, quantity: 1 })),
  listPrice: 5000000, cashPrice: 4000000, startsAt: null, endsAt: null };

describe("regreso a resultados", () => {
  it("conserva filtros, marcas y orden dentro del enlace a la variante", () => {
    const back = catalogReturnHref("/catalogo", { category: "proteinas", brand: "one-fit,star", q: "whey", sort: "price-desc", availability: "in-stock" });
    const url = new URL(productHref("/producto", "whey", "variant-id", back), "https://stylo.invalid");
    expect(url.searchParams.get("volver")).toBe(back);
    expect(safeShopReturn(url.searchParams.get("volver"))).toBe(back);
  });
  it("rechaza destinos externos, administrativos y con barras ambiguas", () => {
    for (const value of ["https://evil.test", "//evil.test/catalogo", "/admin", "/\\evil.test", "/catalogo\n", "/producto/a"])
      expect(safeShopReturn(value)).toBe("/catalogo");
    expect(safeShopReturn("/buscar?q=creatina&pagina=2")).toBe("/buscar?q=creatina&pagina=2");
  });
});

describe("combos publicados en tienda", () => {
  it("publica solo combos comprables y los encuentra por nombre y por cualquiera de sus categorías", () => {
    const offers = availableBundles(catalog, [combo]);
    expect(offers).toHaveLength(1);
    expect(matchingBundles(catalog, offers, { q: "crea proteina" })).toHaveLength(1);
    expect(matchingBundles(catalog, offers, { category: "proteinas" })).toHaveLength(1);
    expect(matchingBundles(catalog, offers, { category: "creatinas" })).toHaveLength(1);
    expect(matchingBundles(catalog, offers, { category: "colageno" })).toHaveLength(0);
    expect(matchingBundles(catalog, offers, { availability: "out-of-stock" })).toHaveLength(0);
  });
  it("usa el precio del combo completo en los filtros y excluye cupos agotados o falta de stock", () => {
    const offers = availableBundles(catalog, [combo]);
    expect(matchingBundles(catalog, offers, { max: "49000" })).toHaveLength(0);
    expect(matchingBundles(catalog, offers, { min: "49000", max: "51000" })).toHaveLength(1);
    expect(availableBundles(catalog, [{ ...combo, maxUses: 1, used: 1 }])).toHaveLength(0);
    const noStock = structuredClone(catalog);
    noStock.products[1].variants[0].stock = 0;
    expect(availableBundles(noStock, [combo])).toHaveLength(0);
    expect(availableBundles(catalog, [{ ...combo, active: false }])).toHaveLength(0);
  });
});
