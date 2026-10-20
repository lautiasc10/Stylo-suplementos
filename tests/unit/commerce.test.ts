import { describe, it, expect } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import {
  parseCart,
  changeCart,
  quoteCart,
  merchandiseTotal,
  validateGuest,
} from "../../src/modules/commerce/cart";
import {
  validatePromotions,
  type Promotion,
} from "../../src/modules/commerce/promotions";
import { previewManualOrder } from "../../src/modules/commerce/orders";
const catalog = demoCatalog(),
  protein = catalog.products[0].variants[0],
  creatine = catalog.products[1].variants[0];
const promo = (patch: Partial<Promotion> = {}): Promotion => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Oferta de prueba",
  kind: "sale",
  active: true,
  components: [{ variantId: protein.id, quantity: 1 }],
  listPrice: 4000000,
  cashPrice: 3900000,
  startsAt: null,
  endsAt: null,
  ...patch,
});
describe("carrito y reglas comerciales de Fase 3", () => {
  it("acepta solo rutas de fotos de combo pertenecientes a la promoción", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const photo = `promotions/${id}/22222222-2222-4222-8222-222222222222.webp`;
    const bundle = promo({ kind: "bundle", imagePath: photo });
    expect(validatePromotions([bundle], catalog)).toEqual([]);
    expect(
      validatePromotions([promo({ imagePath: photo })], catalog),
    ).toContain("La foto del combo no es válida.");
    expect(
      validatePromotions(
        [
          promo({
            kind: "bundle",
            imagePath: `promotions/33333333-3333-4333-8333-333333333333/file.webp`,
          }),
        ],
        catalog,
      ),
    ).toContain("La foto del combo no es válida.");
  });
  it("muestra la fotografía de la variante y solo usa la general como alternativa", () => {
    const data = structuredClone(catalog),
      product = data.products[0];
    const general = {
      id: "11111111-1111-4111-8111-111111111112",
      path: `${product.id}/general.webp`,
      alt: "Foto general",
      variantId: null,
      position: 0,
    };
    const specific = {
      ...general,
      id: "11111111-1111-4111-8111-111111111113",
      path: `${product.id}/chocolate.webp`,
      alt: "Chocolate",
      variantId: protein.id,
      position: 1,
    };
    product.images = [general, specific];
    const image = () =>
      quoteCart(data, [{ variantId: protein.id, quantity: 1 }]).lines[0].image;
    expect(image()).toEqual({ path: specific.path, alt: specific.alt });
    product.images = [general];
    expect(image()).toEqual({ path: general.path, alt: general.alt });
    product.images = [{ ...specific, variantId: product.variants[1].id }];
    expect(image()).toBeUndefined();
  });
  it("persiste solo identificadores y cantidades, rechaza duplicados y límites", () => {
    expect(
      parseCart([{ variantId: protein.id, quantity: 1, listPrice: 1 }]),
    ).toEqual([{ variantId: protein.id, quantity: 1 }]);
    for (const input of [
      [{ variantId: protein.id, quantity: 1.5 }],
      [{ variantId: protein.id, quantity: 1000 }],
      [
        { variantId: protein.id, quantity: 1 },
        { variantId: protein.id, quantity: 1 },
      ],
      {},
    ])
      expect(parseCart(input)).toEqual([]);
  });
  it("agrega el SKU elegido sin superar stock y permite quitar un SKU retirado", () => {
    const result = changeCart(catalog, [], protein.id, "add", 7);
    expect(result.items[0].quantity).toBe(7);
    expect(
      changeCart(catalog, result.items, protein.id, "add", 2).error,
    ).toMatch(/stock/);
    const hidden = structuredClone(catalog);
    hidden.products[0].active = false;
    expect(
      changeCart(hidden, result.items, protein.id, "remove", 1).items,
    ).toEqual([]);
    expect(quoteCart(hidden, result.items).valid).toBe(false);
    expect(quoteCart(hidden, result.items).lines[0].variantId).toBe(protein.id);
  });
  it("revalida precios y existencias después de recuperar el carrito", () => {
    const changed = structuredClone(catalog);
    changed.products[0].variants[0].cashPrice = 10001;
    changed.products[0].variants[0].stock = 1;
    const quote = quoteCart(changed, [{ variantId: protein.id, quantity: 2 }]);
    expect(quote.valid).toBe(false);
    expect(quote.cashSubtotal).toBe(20002);
  });
  it("elige un solo mayor ahorro monetario y puede cambiar según medio de pago", () => {
    const quantity = promo({
      id: "22222222-2222-4222-8222-222222222222",
      name: "Cantidad",
      kind: "quantity",
      components: [{ variantId: protein.id, quantity: 2 }],
      listPrice: 4300000,
      cashPrice: 3500000,
    });
    const quote = quoteCart(
      catalog,
      [{ variantId: protein.id, quantity: 2 }],
      [promo(), quantity],
    );
    expect(quote.listPricing.promotion).toBe("Oferta de prueba");
    expect(quote.cashPricing.promotion).toBe("Cantidad");
    expect(merchandiseTotal(quote, "mercado-pago")).toBe(8000000);
    expect(merchandiseTotal(quote, "efectivo")).toBe(7000000);
  });
  it("cantidad requiere el umbral y su precio final se aplica por unidad", () => {
    const quantity = promo({
      kind: "quantity",
      components: [{ variantId: protein.id, quantity: 3 }],
    });
    expect(
      quoteCart(catalog, [{ variantId: protein.id, quantity: 2 }], [quantity])
        .listPricing.discount,
    ).toBe(0);
    expect(
      quoteCart(catalog, [{ variantId: protein.id, quantity: 3 }], [quantity])
        .listPricing.total,
    ).toBe(12000000);
  });
  it("combos repiten solo grupos completos y cobran sobrantes al precio base", () => {
    const bundle = promo({
      kind: "bundle",
      components: [
        { variantId: protein.id, quantity: 1 },
        { variantId: creatine.id, quantity: 1 },
      ],
      listPrice: 6000000,
      cashPrice: 5000000,
    });
    const quote = quoteCart(
      catalog,
      [
        { variantId: protein.id, quantity: 3 },
        { variantId: creatine.id, quantity: 2 },
      ],
      [bundle],
    );
    expect(quote.listPricing.total).toBe(16500000);
    expect(quote.cashPricing.total).toBe(14100000);
    expect(
      quoteCart(catalog, [{ variantId: protein.id, quantity: 3 }], [bundle])
        .listPricing.discount,
    ).toBe(0);
  });
  it("ignora pausadas, futuras, vencidas y precios que no mejoran el habitual", () => {
    for (const p of [
      promo({ active: false }),
      promo({ startsAt: "2099-01-01T00:00:00Z" }),
      promo({ endsAt: "2000-01-01T00:00:00Z" }),
      promo({ listPrice: 99000000, cashPrice: 99000000 }),
    ])
      expect(
        quoteCart(catalog, [{ variantId: protein.id, quantity: 1 }], [p])
          .listPricing.discount,
      ).toBe(0);
  });
  it("valida los dos precios, fechas, umbrales y componentes sin duplicados", () => {
    expect(validatePromotions([promo()], catalog)).toEqual([]);
    for (const p of [
      promo({ cashPrice: 0 }),
      promo({
        startsAt: "2026-01-02T00:00:00Z",
        endsAt: "2026-01-01T00:00:00Z",
      }),
      promo({ kind: "quantity" }),
      promo({
        kind: "bundle",
        components: [
          { variantId: protein.id, quantity: 1 },
          { variantId: protein.id, quantity: 1 },
        ],
      }),
    ])
      expect(validatePromotions([p], catalog).length).toBeGreaterThan(0);
  });
  it("valida contacto invitado sin habilitar pedidos ni pagos", () => {
    expect(
      validateGuest({
        name: "Cliente de prueba",
        email: "prueba@example.com",
        phone: "3415550000",
        dni: "12345678",
        notes: "",
      }),
    ).toEqual([]);
    expect(
      validateGuest({ name: "", email: "mal", phone: "abc", dni: "1" }),
    ).toHaveLength(4);
  });
  it("el pedido manual congela importes sin marcar pago, cambiar stock ni mutar el catálogo", () => {
    const before = JSON.stringify(catalog),
      order = previewManualOrder(catalog, [promo()], {
        requestId: "33333333-3333-4333-8333-333333333333",
        items: [{ variantId: protein.id, quantity: 2 }],
        customer: { name: "Cliente ficticio", phone: "" },
      });
    expect(order.paymentStatus).toBe("pending");
    expect(order.fulfillmentStatus).toBe("pending_pickup");
    expect(order.total).toBe(7800000);
    expect(JSON.stringify(catalog)).toBe(before);
  });
});
