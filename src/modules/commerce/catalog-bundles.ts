import { filterCatalog, matchingVariants, parseMoney, type Catalog, type CatalogFilters } from "../catalog/model";
import { productOffers } from "./product-offers";
import type { Promotion } from "./promotions";

export type BundleOffer = ReturnType<typeof productOffers>[number];

export function availableBundles(catalog: Catalog, promotions: Promotion[], now = Date.now()): BundleOffer[] {
  return promotions.flatMap((promotion) => promotion.kind === "bundle" && promotion.components[0]
    ? productOffers(catalog, [promotion], promotion.components[0].variantId, now)
    : []);
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function matchingBundles(catalog: Catalog, offers: BundleOffer[], filters: CatalogFilters) {
  if (filters.availability === "out-of-stock") return [];
  const componentFilters = { ...filters, q: undefined, min: undefined, max: undefined, promotion: undefined };
  const variants = new Set(filterCatalog(catalog, componentFilters).flatMap(({ product }) =>
    matchingVariants(product, componentFilters).map((variant) => variant.id)));
  const terms = normalize((filters.q ?? "").slice(0, 100)).split(" ").filter(Boolean);
  let min = 0, max = Infinity;
  try {
    if (filters.min) min = parseMoney(filters.min);
    if (filters.max) max = parseMoney(filters.max);
  } catch { return []; }
  const result = offers.filter((offer) => {
    const text = normalize([offer.name, ...offer.components.flatMap((c) => [c.product!.name, c.variant!.flavor,
      catalog.brands.find((b) => b.id === c.product!.brandId)?.name ?? ""])].join(" "));
    return offer.components.some((c) => variants.has(c.variantId)) && terms.every((term) => text.includes(term)) &&
      offer.listPrice >= min && offer.listPrice <= max;
  });
  if (filters.sort === "price-asc" || filters.sort === "price-desc")
    result.sort((a, b) => (a.listPrice - b.listPrice) * (filters.sort === "price-desc" ? -1 : 1));
  return result;
}
