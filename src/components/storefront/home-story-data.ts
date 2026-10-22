import { publicCatalog, type Catalog } from "@/modules/catalog/model";
import { catalogMediaSource } from "@/modules/catalog/media-source";

export function homeStoryData(
  catalog: Catalog,
  imageBase = "",
  imageUrls: Record<string, string> = {},
) {
  const data = publicCatalog(catalog);
  const brands = data.brands.filter((brand) =>
    data.products.some((product) => product.brandId === brand.id),
  );
  const categories = data.categories.filter((category) =>
    data.products.some((product) => product.categoryIds.includes(category.id)),
  );
  return {
    stats: [
      { value: data.products.length, label: "Productos en la tienda" },
      { value: brands.length, label: "Marcas" },
      { value: categories.length, label: "Categorías" },
    ],
    brands: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo
        ? catalogMediaSource(
            imageUrls[brand.logo] ||
              (imageBase ? `${imageBase}/${brand.logo}` : ""),
            imageBase,
            "thumbnail",
          )
        : "",
    })),
  };
}
