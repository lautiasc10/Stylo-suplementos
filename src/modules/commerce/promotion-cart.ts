import type { Catalog } from "../catalog/model";
import {
  changeCart,
  quoteCart,
  type CartItem,
  type PaymentMethod,
} from "./cart";
import { productOffers } from "./product-offers";
import { priceLines, type Promotion } from "./promotions";

/** Add one advertised offer as a single cart mutation, never a partial combo. */
export function addPromotionToCart(
  catalog: Catalog,
  items: CartItem[],
  promotions: Promotion[],
  promotionId: string,
  now = Date.now(),
): { items: CartItem[]; error?: string } {
  const promotion = promotions.find((item) => item.id === promotionId);
  const offer = promotion?.components[0]
    ? productOffers(
        catalog,
        [promotion],
        promotion.components[0].variantId,
        now,
      )[0]
    : undefined;
  if (!offer)
    return {
      items,
      error: "La promoción ya no está disponible. Revisá las ofertas vigentes.",
    };

  let next = items;
  for (const component of offer.components) {
    const result = changeCart(
      catalog,
      next,
      component.variantId,
      "add",
      component.quantity,
    );
    if (result.error) return { items, error: result.error };
    next = result.items;
  }
  const lines = quoteCart(catalog, next).lines;
  if (
    !priceLines(lines, [promotion!], "transferencia", now).discount &&
    !priceLines(lines, [promotion!], "mercado-pago", now).discount
  )
    return {
      items,
      error:
        "La cantidad del carrito supera el cupo disponible de esta promoción.",
    };
  return { items: next };
}

/** The reference price follows the same payment method as the advertised price. */
export function promotionPrice(
  offer: ReturnType<typeof productOffers>[number],
  method: PaymentMethod,
) {
  const field = method === "mercado-pago" ? "listPrice" : "cashPrice";
  const original =
    offer.kind === "bundle"
      ? offer.components.reduce(
          (sum, component) =>
            sum + component.variant![field] * component.quantity,
          0,
        )
      : offer.components[0].variant![field];
  const price = offer[field];
  const saving = Math.max(0, original - price);
  return {
    price,
    original,
    saving,
    percentage: original > 0 ? Math.round((saving / original) * 100) : 0,
    quantity: offer.kind === "quantity" ? offer.components[0].quantity : 1,
  };
}
