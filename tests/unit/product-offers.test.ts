import { describe, it, expect } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import {
  productOffers,
  promotedVariantIds,
} from "../../src/modules/commerce/product-offers";
import { filterCatalog } from "../../src/modules/catalog/model";
import type { Promotion } from "../../src/modules/commerce/promotions";
const catalog = demoCatalog(),
  variant = catalog.products[0].variants[0];
const offer: Promotion = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Oferta de prueba",
  active: true,
  kind: "quantity",
  components: [{ variantId: variant.id, quantity: 2 }],
  listPrice: 4000000,
  cashPrice: 3500000,
  startsAt: null,
  endsAt: null,
};
describe("ofertas antes de agregar al carrito", () => {
  it("muestra precios por unidad y las condiciones mínimas", () => {
    const [shown] = productOffers(catalog, [offer], variant.id);
    expect(shown.listPrice).toBe(4000000);
    expect(shown.cashPrice).toBe(3500000);
    expect(shown.components[0].quantity).toBe(2);
  });
  it("omite ofertas pausadas, futuras, vencidas, sin ahorro o sin stock suficiente", () => {
    const now = Date.parse("2026-10-11T12:00:00Z");
    const cases = [
      { ...offer, active: false },
      { ...offer, startsAt: "2026-10-12T00:00:00Z" },
      { ...offer, endsAt: "2026-10-11T12:00:00Z" },
      { ...offer, listPrice: 99999999, cashPrice: 99999999 },
      { ...offer, components: [{ variantId: variant.id, quantity: 9 }] },
    ];
    expect(productOffers(catalog, cases, variant.id, now)).toEqual([]);
  });
  it("filtra el catálogo por variantes con promociones vigentes y comprables", () => {
    const sale = {
      ...offer,
      kind: "sale" as const,
      components: [{ variantId: variant.id, quantity: 1 }],
    };
    const promoted = promotedVariantIds(catalog, [
      sale,
      { ...offer, id: "22222222-2222-4222-8222-222222222222", active: false },
    ]);
    expect(promoted.has(variant.id)).toBe(true);
    expect(
      filterCatalog(catalog, { promotion: "active" }, promoted).map(
        (item) => item.product.id,
      ),
    ).toEqual([catalog.products[0].id]);
    expect(filterCatalog(catalog, { promotion: "active" }, new Set())).toEqual(
      [],
    );
  });
  it("un combo expone todas las presentaciones, su precio completo y nunca aumenta un medio de pago", () => {
    const bundle = {
      ...offer,
      kind: "bundle" as const,
      listPrice: 99999999,
      components: [
        { variantId: variant.id, quantity: 1 },
        { variantId: catalog.products[1].variants[0].id, quantity: 1 },
      ],
    };
    const [shown] = productOffers(catalog, [bundle], variant.id);
    expect(shown.components).toHaveLength(2);
    expect(shown.cashPrice).toBe(3500000);
    expect(shown.listPrice).toBe(
      variant.listPrice + catalog.products[1].variants[0].listPrice,
    );
    const hidden = structuredClone(catalog);
    hidden.products[1].active = false;
    expect(productOffers(hidden, [bundle], variant.id)).toEqual([]);
  });
});
