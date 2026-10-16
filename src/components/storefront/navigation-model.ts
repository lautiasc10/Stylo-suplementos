import {
  publicCatalog,
  variantImages,
  variantLabel,
  type Catalog,
  type Variant,
} from "@/modules/catalog/model";
import { catalogMediaSource } from "@/modules/catalog/media-source";

export type MenuProduct = {
  id: string;
  name: string;
  slug: string;
  variant: Variant;
  variantLabel: string;
  image: string;
};
export type MenuCategory = {
  name: string;
  slug: string;
  products?: MenuProduct[];
};

// Public, small snapshots only. No descriptions, admin data or extra queries.
export function navigationCategories(
  catalog: Catalog,
  imageBase: string,
  imageUrls: Record<string, string> = {},
): MenuCategory[] {
  const data = publicCatalog(catalog);
  return [...data.categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      name: category.name,
      slug: category.slug,
      products: data.products
        .filter((p) => p.categoryIds.includes(category.id))
        .sort((a, b) => Number(b.featured) - Number(a.featured))
        .slice(0, 3)
        .map((product) => {
          const variant =
            product.variants.find((v) => v.stock > 0) ?? product.variants[0];
          const image = variantImages(product, variant.id)[0];
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            variant,
            variantLabel: variantLabel(variant),
            image:
              image && (imageBase || imageUrls[image.path])
                ? catalogMediaSource(
                    imageUrls[image.path] || `${imageBase}/${image.path}`,
                    imageBase,
                    "thumbnail",
                  )
                : "",
          };
        }),
    }));
}
