import { flavorLabel, publicCatalog, variantImages, variantLabel, type Catalog } from "./model";
import { catalogMediaSource } from "./media-source";

export const POPULAR_SEARCHES = [
  "Whey protein",
  "Creatina",
  "Pre-entreno",
  "Colágeno",
  "BCAA",
] as const;
export type SearchGroup = { name: string; slug: string };
export type SearchVariant = {
  id: string;
  flavor: string;
  label: string;
  listPrice: number;
  stock: number;
  image: string;
};
export type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  brand: SearchGroup;
  categories: SearchGroup[];
  variants: SearchVariant[];
  createdAt?: string;
};
export type SearchIndex = {
  products: SearchProduct[];
  categories: SearchGroup[];
  brands: SearchGroup[];
};
export const EMPTY_SEARCH_INDEX: SearchIndex = {
  products: [],
  categories: [],
  brands: [],
};
export type SearchFilters = {
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  stock?: boolean;
  sort?: string;
};
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR");
const words = (value: string) =>
  normalizeSearch(value)
    .replace(/[-‐‑–]/g, "")
    .match(/[\p{L}\p{N}]+/gu) ?? [];

export function createSearchIndex(
  catalog: Catalog,
  imageBase = "",
  imageUrls: Record<string, string> = {},
): SearchIndex {
  const data = publicCatalog(catalog);
  return {
    categories: data.categories.map(({ name, slug }) => ({ name, slug })),
    brands: data.brands.map(({ name, slug }) => ({ name, slug })),
    products: data.products.map((product) => {
      const brand = data.brands.find((b) => b.id === product.brandId)!;
      const date =
        "createdAt" in product &&
        typeof product.createdAt === "string" &&
        Number.isFinite(Date.parse(product.createdAt))
          ? product.createdAt
          : undefined;
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: { name: brand.name, slug: brand.slug },
        categories: data.categories
          .filter((c) => product.categoryIds.includes(c.id))
          .map(({ name, slug }) => ({ name, slug })),
        ...(date ? { createdAt: date } : {}),
        variants: product.variants.map((v) => {
          const image = variantImages(product, v.id)[0];
          const source =
            image && (imageBase || imageUrls[image.path])
              ? imageUrls[image.path] || `${imageBase}/${image.path}`
              : "";
          return {
            id: v.id,
            flavor: flavorLabel(v.flavor),
            label: variantLabel(v),
            listPrice: v.listPrice,
            stock: v.stock,
            image: catalogMediaSource(source, imageBase, "thumbnail"),
          };
        }),
      };
    }),
  };
}

// Bounded Damerau-Levenshtein for short words, including adjacent transpositions.
// Prefixes and exact matches win. No dependency, network request or full-text description scan.
function distance(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit || a.length > 40 || b.length > 40)
    return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i),
    before = previous;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        row[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        row[j] = Math.min(row[j], before[j - 2] + 1);
      best = Math.min(best, row[j]);
    }
    if (best > limit) return limit + 1;
    before = previous;
    previous = row;
  }
  return previous[b.length];
}
function wordScore(query: string, candidate: string) {
  if (query === candidate) return 0;
  if (candidate.startsWith(query)) return 0.18;
  if (query.length >= 3 && candidate.includes(query)) return 0.4;
  const limit = query.length >= 6 ? 2 : query.length >= 3 ? 1 : 0;
  if (!limit) return Infinity;
  const edits = distance(query, candidate, limit);
  return edits <= limit ? 0.8 + edits * 0.2 : Infinity;
}
type Field = { tokens: string[]; weight: number };
function scoreQuery(query: string[], fields: Field[]) {
  let total = 0;
  for (const term of query) {
    let best = Infinity;
    for (const field of fields)
      for (const word of field.tokens)
        best = Math.min(best, wordScore(term, word) + field.weight);
    if (!Number.isFinite(best)) return Infinity;
    total += best;
  }
  return total;
}
export function prepareSearch(index: SearchIndex) {
  const prepared = index.products.map((product) => ({
    product,
    fields: [
      { tokens: words(product.name), weight: 0 },
      { tokens: words(product.brand.name), weight: 0.22 },
      {
        tokens: words(product.categories.map((c) => c.name).join(" ")),
        weight: 0.35,
      },
    ],
    variants: product.variants.map((variant) => ({
      variant,
      field: { tokens: words(variant.flavor), weight: 0.1 },
    })),
  }));
  return (text: string, filters: SearchFilters = {}) => {
    const query = words(text.slice(0, 100)).slice(0, 10);
    const products = prepared
      .flatMap(({ product, fields, variants }) => {
        if (
          (filters.brand && filters.brand !== product.brand.slug) ||
          (filters.category &&
            !product.categories.some((c) => c.slug === filters.category))
        )
          return [];
        const matching = variants
          .flatMap(({ variant, field }) => {
            if (
              (filters.stock && variant.stock <= 0) ||
              (filters.min !== undefined && variant.listPrice < filters.min) ||
              (filters.max !== undefined && variant.listPrice > filters.max)
            )
              return [];
            const score = scoreQuery(query, [...fields, field]);
            return Number.isFinite(score) ? [{ variant, score }] : [];
          })
          .sort(
            (a, b) =>
              a.score - b.score ||
              Number(b.variant.stock > 0) - Number(a.variant.stock > 0) ||
              a.variant.listPrice - b.variant.listPrice,
          );
        if (!matching.length) return [];
        return [
          {
            product,
            variant: matching[0].variant,
            score: matching[0].score,
            variants: matching.map((m) => m.variant),
          },
        ];
      })
      .sort((a, b) =>
        filters.sort === "price-asc"
          ? a.variant.listPrice - b.variant.listPrice || a.score - b.score
          : filters.sort === "price-desc"
            ? b.variant.listPrice - a.variant.listPrice || a.score - b.score
            : filters.sort === "newest"
              ? (Date.parse(b.product.createdAt ?? "") || 0) -
                  (Date.parse(a.product.createdAt ?? "") || 0) ||
                a.score - b.score
              : a.score - b.score ||
                a.product.name.localeCompare(b.product.name, "es"),
      );
    function groups(entries: SearchGroup[]) {
      return query.length
        ? entries
            .map((group) => ({
              group,
              score: scoreQuery(query, [
                { tokens: words(group.name), weight: 0 },
              ]),
            }))
            .filter((g) => Number.isFinite(g.score))
            .sort((a, b) => a.score - b.score)
            .slice(0, 3)
            .map((g) => g.group)
        : [];
    }
    return {
      products,
      categories: groups(index.categories),
      brands: groups(index.brands),
    };
  };
}
export function highlightSearch(name: string, query: string) {
  const terms = words(query.slice(0, 100));
  return name.split(/([\p{L}\p{N}]+)/u).map((text) => ({
    text,
    match:
      !!text.trim() &&
      terms.some((term) =>
        Number.isFinite(wordScore(term, normalizeSearch(text))),
      ),
  }));
}
