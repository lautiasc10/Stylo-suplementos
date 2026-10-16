import { SearchPreview } from "@/components/catalog/search-preview";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = Object.fromEntries(
    Object.entries(await searchParams).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  return (
    <>
      <SearchPreview params={params} />
      <noscript>
        La vista previa local requiere JavaScript. La búsqueda pública está
        disponible en /buscar.
      </noscript>
    </>
  );
}
