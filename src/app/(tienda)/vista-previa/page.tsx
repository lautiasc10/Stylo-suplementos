import { CatalogPreview } from "@/components/catalog/preview";
export default async function PreviewPage({
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
  return (
    <>
      <CatalogPreview
        mode="catalog"
        filters={{
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
      />
    </>
  );
}
