import { CatalogPreview } from "@/components/catalog/preview";
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <p className="eyebrow">EXPLORÁ STYLO</p>
      <h1>Catálogo de prueba</h1>
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
