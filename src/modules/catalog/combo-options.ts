import { galleryPhotos } from "@/components/catalog/gallery-images";
import { publicCatalog, variantLabel, type Catalog } from "./model";

export type ComboOption = {
  variantId: string;
  productName: string;
  label: string;
  stock: number;
  listPrice: number;
  cashPrice: number;
  image: string;
  imageSrcSet?: string;
};
export type ComboCategory = {
  id: string;
  slug: string;
  name: string;
  options: ComboOption[];
};

export function comboOptions(
  catalog: Catalog,
  imageBase: string,
  imageUrls: Record<string, string> = {},
): ComboCategory[] {
  const visible = publicCatalog(catalog);
  return visible.categories.flatMap((category) => {
    const options = visible.products
      .filter((product) => product.categoryIds.includes(category.id))
      .flatMap((product) =>
        product.variants
          .filter((variant) => variant.stock > 0)
          .map((variant) => {
            const photo = galleryPhotos(product, variant.id, imageBase, imageUrls, "card")[0];
            return {
              variantId: variant.id,
              productName: product.name,
              label: variantLabel(variant),
              stock: variant.stock,
              listPrice: variant.listPrice,
              cashPrice: variant.cashPrice,
              image: photo?.src ?? "",
              imageSrcSet: photo?.srcSet,
            };
          }),
      )
      .sort((a, b) => a.productName.localeCompare(b.productName, "es-AR"));
    return options.length
      ? [{ id: category.id, slug: category.slug, name: category.name, options }]
      : [];
  });
}
