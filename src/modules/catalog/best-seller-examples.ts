import { publicCatalog, type Catalog } from "./model";
import { galleryPhotos } from "@/components/catalog/gallery-images";
import { referenceProduct, type ReferenceProduct } from "@/components/storefront/reference-product";
import type { Promotion } from "@/modules/commerce/promotions";

/** Editorial examples until a verified, paid-sales ranking is available. */
export function bestSellerExamples(
  catalog: Catalog,
  imageBase: string,
  promotions: Promotion[] = [],
  imageUrls: Record<string, string> = {},
  prefix = "",
): ReferenceProduct[] {
  const visible = publicCatalog(catalog);
  const photographed = visible.products.filter((product) =>
    product.variants.some(
      (variant) =>
        variant.stock > 0 &&
        galleryPhotos(product, variant.id, imageBase, imageUrls, "card").length > 0,
    ),
  );
  const selected: typeof photographed = [];
  for (const slug of ["proteinas", "creatinas", "pre-entrenos"]) {
    const category = visible.categories.find((item) => item.slug === slug);
    const product = photographed.find(
      (item) =>
        category && item.categoryIds.includes(category.id) && !selected.includes(item),
    );
    if (product) selected.push(product);
  }
  for (const product of photographed) {
    if (selected.length >= 3) break;
    if (!selected.includes(product)) selected.push(product);
  }
  return selected.flatMap((product) => {
    const item = referenceProduct(
      { ...visible, products: [product] },
      imageBase,
      promotions,
      imageUrls,
    );
    return item ? [{ ...item, href: `${prefix}${item.href}` }] : [];
  });
}
