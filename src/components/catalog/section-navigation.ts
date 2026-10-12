export const catalogSections = [
  ["products", "Productos"],
  ["brands", "Marcas"],
  ["categories", "Categorías"],
  ["import", "Carga masiva"],
] as const;

export function catalogSection(value: string | null) {
  return catalogSections.find(([key]) => key === value)?.[0] ?? "products";
}

// These sections share one loaded catalog. Only the section URL changes;
// initial access and writes retain their server authorization checks.
export function navigateCatalogSection(section: string) {
  const next = new URL(window.location.href);
  const selection = catalogSection(section);
  if (catalogSection(next.searchParams.get("seccion")) === selection) return;
  next.searchParams.set("seccion", selection);
  window.history.pushState(null, "", next);
}
