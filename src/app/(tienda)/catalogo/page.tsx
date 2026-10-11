import type { Metadata } from "next";
import { categories } from "@/modules/catalog/categories";
import { getCatalog } from "@/modules/catalog/server";
import { getEnvironment } from "@/lib/config/server";
import { CatalogListing } from "@/components/catalog/listing";
import { publicCatalog } from "@/modules/catalog/model";
export const metadata: Metadata = { title: "Catálogo" };
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;
  const { catalog, configured, error } = await getCatalog();
  const navigation =
    configured && !error
      ? catalog.categories.filter((item) => item.active)
      : categories;
  const selection = navigation.find((item) => item.slug === value("categoria"));
  const config = getEnvironment().supabase;
  return (
    <section className="container interior-page">
      <p className="eyebrow">LA SELECCIÓN STYLO</p>
      <h1>{selection?.name ?? "Nuestro catálogo"}</h1>
      <p className="page-intro">
        Suplementos y accesorios para encontrar tu próxima elección.
      </p>
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
            q: value("q"),
            category: value("categoria"),
            brand: value("marca"),
            flavor: value("sabor"),
            availability: value("disponibilidad"),
            min: value("min"),
            max: value("max"),
            sort: value("orden"),
          }}
          imageBase={
            config ? `${config.url}/storage/v1/object/public/product-media` : ""
          }
        />
      )}
    </section>
  );
}
