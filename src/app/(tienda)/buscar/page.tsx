import type { Metadata } from "next";
import { SearchResults } from "@/components/catalog/search-results";
import { getCatalog } from "@/modules/catalog/server";
import { getEnvironment } from "@/lib/config/server";
export const metadata: Metadata = { title: "Buscar productos" };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = Object.fromEntries(
    Object.entries(await searchParams).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const { catalog, error } = await getCatalog(),
    config = getEnvironment().supabase;
  return (
    <SearchResults
      catalog={catalog}
      params={params}
      imageBase={
        config ? `${config.url}/storage/v1/object/public/product-media` : ""
      }
      error={error}
    />
  );
}
