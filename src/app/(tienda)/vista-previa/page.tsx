import { CatalogPreview } from "@/components/catalog/preview";
import { CatalogHeading } from "@/components/catalog/catalog-heading";
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <CatalogHeading title="Catálogo de prueba" preview />
      <CatalogPreview
        mode="catalog"
        filters={{
          q: params.q,
          category: params.categoria,
          brand: params.marca,
          flavor: params.sabor,
          availability: params.disponibilidad,
          min: params.min,
          max: params.max,
          sort: params.orden,
        }}
      />
    </>
  );
}
