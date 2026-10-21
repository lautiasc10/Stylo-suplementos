import { getEnvironment } from "@/lib/config/server";
import { getCatalog } from "@/modules/catalog/server";
import { publicSitemap } from "@/modules/seo/sitemap";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const { catalog, error } = await getCatalog();
  // Do not publish a successful but incomplete inventory during a catalog outage.
  if (error)
    throw new Error("No pudimos consultar el catálogo para el sitemap.");
  return publicSitemap(catalog, getEnvironment().siteUrl);
}
