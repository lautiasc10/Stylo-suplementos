import { publicCatalog, type Catalog } from "./model";
import { bestSellerExamples } from "./best-seller-examples";
import { referenceProduct } from "@/components/storefront/reference-product";
import type { Promotion } from "@/modules/commerce/promotions";
import type { MonthlyRank } from "@/modules/storefront/content-server";

export function homeRanking(
  catalog: Catalog,
  imageBase: string,
  promotions: Promotion[],
  ranking: MonthlyRank[],
  imageUrls: Record<string, string> = {},
) {
  const visible = publicCatalog(catalog);
  const used = new Set<string>();
  const products = ranking
    .flatMap((row) => {
      if (used.has(row.productId)) return [];
      const product = visible.products.find(
        (item) => item.id === row.productId,
      );
      const variant = product?.variants.find(
        (item) => item.id === row.variantId,
      );
      if (!product || !variant) return [];
      used.add(product.id);
      const entry = referenceProduct(
        { ...visible, products: [{ ...product, variants: [variant] }] },
        imageBase,
        promotions,
        imageUrls,
      );
      return entry ? [entry] : [];
    })
    .slice(0, 3);
  // Never pad a genuine ranking with invented sales or blend example ranks.
  if (products.length === 3) return { products, example: false };
  return {
    products: bestSellerExamples(visible, imageBase, promotions, imageUrls),
    example: true,
  };
}
