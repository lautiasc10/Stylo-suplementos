import { categories } from "@/modules/catalog/categories";
import { getCatalog } from "@/modules/catalog/server";
import { getEnvironment } from "@/lib/config/server";
import { CatalogListing } from "@/components/catalog/listing";
import { publicCatalog } from "@/modules/catalog/model";
import { readPromotions } from "@/modules/commerce/promotions-server";
import { pageMetadata } from "@/modules/seo/metadata";
export function generateMetadata() {
  return pageMetadata({
    title: "Tienda",
    description:
      "Explorá los productos de STYLO Suplementos. Filtrá por categoría, marca, sabor, precio y disponibilidad.",
    path: "/catalogo",
    siteUrl: getEnvironment().siteUrl,
  });
}
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) =>
    typeof params[key] === "string"
      ? (params[key] as string)
      : key === "marca" && Array.isArray(params[key])
        ? params[key].join(",")
        : undefined;
  const [{ catalog, configured, error }, promotions] = await Promise.all([
    getCatalog(),
    readPromotions(),
  ]);
  const navigation =
    configured && !error
      ? catalog.categories.filter((item) => item.active)
      : categories;
  const config = getEnvironment().supabase;
  return (
    <section className="container interior-page catalog-page">
      {error ? (
        <div className="configuration-notice" role="alert">
          No pudimos cargar el catálogo. Intentá nuevamente en unos minutos.
        </div>
      ) : (
        <CatalogListing
          catalog={publicCatalog(catalog)}
          filterCategories={navigation.map((item) => ({
            id: item.slug,
            name: item.name,
            slug: item.slug,
          }))}
          filters={{
            goal: value("objetivo"),
            q: value("q"),
            category: value("categoria"),
            brand: value("marca"),
            flavor: value("sabor"),
            availability: value("disponibilidad"),
            promotion: value("promocion"),
            min: value("min"),
            max: value("max"),
            sort: value("orden"),
          }}
          promotions={promotions.state.promotions}
          imageBase={
            config ? `${config.url}/storage/v1/object/public/product-media` : ""
          }
        />
      )}
    </section>
  );
}
