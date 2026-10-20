import { describe, expect, it } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import {
  addPromotionToCart,
  promotionPrice,
} from "../../src/modules/commerce/promotion-cart";
import { productOffers } from "../../src/modules/commerce/product-offers";
import { quoteCart } from "../../src/modules/commerce/cart";
import type { Promotion } from "../../src/modules/commerce/promotions";

const catalog = demoCatalog();
const protein = catalog.products[0].variants[0];
const creatine = catalog.products[1].variants[0];
const bundle: Promotion = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Combo de prueba",
  kind: "bundle",
  active: true,
  components: [
    { variantId: protein.id, quantity: 1 },
    { variantId: creatine.id, quantity: 2 },
  ],
  listPrice: 8000000,
  cashPrice: 7000000,
  startsAt: null,
  endsAt: null,
};

describe("publicaciones de promociones y agregado atómico", () => {
  it("agrega un combo completo conservando las cantidades anteriores y calcula el precio real", () => {
    const result = addPromotionToCart(
      catalog,
      [{ variantId: protein.id, quantity: 1 }],
      [bundle],
      bundle.id,
    );
    expect(result.error).toBeUndefined();
    expect(result.items).toEqual([
      { variantId: protein.id, quantity: 2 },
      { variantId: creatine.id, quantity: 2 },
    ]);
    const quote = quoteCart(catalog, result.items, [bundle]);
    expect(quote.cashPricing.total).toBe(7000000 + protein.cashPrice);
    expect(quote.listPricing.total).toBe(8000000 + protein.listPrice);
  });
  it("no guarda ningún componente cuando el último no tiene stock suficiente", () => {
    const items = [{ variantId: creatine.id, quantity: 7 }];
    const result = addPromotionToCart(catalog, items, [bundle], bundle.id);
    expect(result.error).toMatch(/stock/);
    expect(result.items).toBe(items);
    expect(items).toEqual([{ variantId: creatine.id, quantity: 7 }]);
  });
  it("agrega el mínimo de unidades necesario para la oferta de cantidad", () => {
    const offer: Promotion = {
      ...bundle,
      kind: "quantity",
      components: [{ variantId: protein.id, quantity: 3 }],
      listPrice: 4000000,
      cashPrice: 3500000,
    };
    const result = addPromotionToCart(catalog, [], [offer], offer.id);
    expect(result.items).toEqual([{ variantId: protein.id, quantity: 3 }]);
    expect(quoteCart(catalog, result.items, [offer]).cashPricing.total).toBe(
      10500000,
    );
  });
  it("revalida vigencia, visibilidad y cupo antes de agregar, incluso con un carrito previo", () => {
    for (const offer of [
      { ...bundle, active: false },
      { ...bundle, endsAt: "2026-01-01T00:00:00Z" },
      { ...bundle, maxUses: 1, used: 1 },
    ])
      expect(
        addPromotionToCart(catalog, [], [offer], offer.id).error,
      ).toBeTruthy();
    const limited = { ...bundle, maxUses: 1 };
    const first = addPromotionToCart(catalog, [], [limited], limited.id);
    const second = addPromotionToCart(
      catalog,
      first.items,
      [limited],
      limited.id,
    );
    expect(second.error).toMatch(/cupo/);
    expect(second.items).toBe(first.items);
    const hidden = structuredClone(catalog);
    hidden.products[1].active = false;
    expect(
      addPromotionToCart(hidden, [], [bundle], bundle.id).error,
    ).toBeTruthy();
    expect(
      addPromotionToCart(catalog, [], [bundle], "no-existe").error,
    ).toBeTruthy();
  });
  it("compara contra el precio del mismo medio de pago, por unidad o combo, y redondea el porcentaje", () => {
    const [offer] = productOffers(catalog, [bundle], protein.id);
    const cash = promotionPrice(offer, "transferencia");
    const list = promotionPrice(offer, "mercado-pago");
    expect(cash.original).toBe(protein.cashPrice + 2 * creatine.cashPrice);
    expect(list.original).toBe(protein.listPrice + 2 * creatine.listPrice);
    expect(cash.saving).toBe(cash.original - 7000000);
    expect(list.saving).toBe(list.original - 8000000);
    expect(cash.percentage).toBe(Math.round((cash.saving * 100) / cash.original));
  });
});
