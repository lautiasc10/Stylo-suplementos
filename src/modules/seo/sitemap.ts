import type { MetadataRoute } from "next";
import { publicCatalog, type Catalog } from "@/modules/catalog/model";
import { productPath } from "./product";

export function publicSitemap(
  catalog: Catalog,
  siteUrl: URL,
): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/catalogo",
    "/nosotros",
    "/contacto",
    ...publicCatalog(catalog).products.map(productPath),
  ];
  // No search/filter/variant URLs, private routes or invented modification dates.
  return [...new Set(paths)].map((path) => ({
    url: new URL(path, siteUrl).href,
  }));
}
