import { CatalogPreview } from "@/components/catalog/preview";
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <h1 className="sr-only">Catálogo de prueba</h1>
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
