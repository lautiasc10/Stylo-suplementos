import { publicCatalog, type Catalog } from "../catalog/model";
import { priceLines, type Promotion } from "./promotions";

// Only advertise offers that can be bought, with complete conditions and a real saving.
export function productOffers(
  catalog: Catalog,
  promotions: Promotion[],
  variantId: string,
  now = Date.now(),
) {
  const data = publicCatalog(catalog);
  const variants = data.products.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );
  return promotions.flatMap((offer) => {
    if (
      !offer.active ||
      !offer.components.some((c) => c.variantId === variantId) ||
      (offer.startsAt && Date.parse(offer.startsAt) > now) ||
      (offer.endsAt && Date.parse(offer.endsAt) <= now)
    )
      return [];
    const components = offer.components.map((component) => ({
      ...component,
      ...variants.find((item) => item.variant.id === component.variantId),
    }));
    if (components.some((c) => !c.variant || c.variant.stock < c.quantity))
      return [];
    const lines = components.map((c) => ({
      variantId: c.variantId,
      quantity: c.quantity,
      listPrice: c.variant!.listPrice,
      cashPrice: c.variant!.cashPrice,
      available: true,
    }));
    const list = priceLines(lines, [offer], "mercado-pago", now);
    const cash = priceLines(lines, [offer], "transferencia", now);
    if (!list.discount && !cash.discount) return [];
    const units = offer.kind === "quantity" ? offer.components[0].quantity : 1;
    return [
      {
        ...offer,
        listPrice: list.total / units,
        cashPrice: cash.total / units,
        components,
      },
    ];
  });
}
