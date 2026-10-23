import type { CatalogFilters } from "./model";

export function catalogReturnHref(action: string, filters: CatalogFilters) {
  const query = new URLSearchParams();
  const fields = { objetivo: filters.goal, q: filters.q, categoria: filters.category,
    marca: filters.brand, sabor: filters.flavor, disponibilidad: filters.availability,
    promocion: filters.promotion, min: filters.min, max: filters.max, orden: filters.sort };
  for (const [key, value] of Object.entries(fields)) if (value) query.set(key, value);
  return `${action}${query.size ? `?${query}` : ""}`;
}

/** Only a local results page can become a return destination. */
export function safeShopReturn(value: unknown, fallback = "/catalogo") {
  if (typeof value !== "string" || value.length > 4096 || !value.startsWith("/") || /[\\\r\n]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://stylo.invalid");
    if (url.origin !== "https://stylo.invalid" || !["/catalogo", "/buscar", "/vista-previa", "/vista-previa/buscar"].includes(url.pathname)) return fallback;
    return `${url.pathname}${url.search}`;
  } catch { return fallback; }
}

export function productHref(prefix: string, slug: string, variantId: string, returnHref?: string) {
  const query = new URLSearchParams({ variante: variantId });
  if (returnHref) query.set("volver", safeShopReturn(returnHref));
  return `${prefix}/${slug}?${query}`;
}

export function comboHref(id: string, preview = false, returnHref?: string) {
  return `${preview ? "/vista-previa" : ""}/combo/${id}${returnHref ? `?volver=${encodeURIComponent(safeShopReturn(returnHref))}` : ""}`;
}
