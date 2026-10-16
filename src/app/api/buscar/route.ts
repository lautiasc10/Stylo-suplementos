import { NextResponse } from "next/server";
import { getCatalog } from "@/modules/catalog/server";
import { getEnvironment } from "@/lib/config/server";
import { createSearchIndex } from "@/modules/catalog/search";

export async function GET() {
  const { catalog, error } = await getCatalog();
  if (error)
    return NextResponse.json(
      { error: "No pudimos cargar la búsqueda." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const config = getEnvironment().supabase;
  return NextResponse.json(
    createSearchIndex(
      catalog,
      config ? `${config.url}/storage/v1/object/public/product-media` : "",
    ),
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
