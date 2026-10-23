import { CATALOG_GOALS } from "./goals";
import { validImagePath } from "./image-profile";

export type CatalogGroup = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sortOrder: number;
  detail?: string;
  logo?: string;
};
export type Variant = {
  id: string;
  sku: string;
  flavor: string;
  size: string;
  presentation: string;
  listPrice: number;
  cashPrice: number;
  stock: number;
  active: boolean;
};
export type ProductImage = {
  id: string;
  path: string;
  alt: string;
  variantId: string | null;
  position: number;
  view?: "left" | "back" | "right";
};
export type Product = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  categoryIds: string[];
  description: string;
  tags: string[];
  active: boolean;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  version: number;
  variants: Variant[];
  images: ProductImage[];
  informationImages?: ProductImage[];
  /** Real package angles, separate from covers and manufacturer documents. */
  turnImages?: ProductImage[];
};
export type Catalog = {
  revision: number;
  lowStockThreshold?: number;
  brands: CatalogGroup[];
  categories: CatalogGroup[];
  products: Product[];
};
export type CatalogFilters = {
  goal?: string;
  q?: string;
  category?: string;
  brand?: string;
  flavor?: string;
  availability?: string;
  promotion?: string;
  min?: string;
  max?: string;
  sort?: string;
};
export const emptyCatalog: Catalog = {
  revision: 0,
  brands: [],
  categories: [],
  products: [],
};
const priceFormatters = Object.fromEntries(
  [0, 2].map((fractionDigits) => [
    fractionDigits,
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }),
  ]),
);
export const formatPrice = (cents: number, fractionDigits: 0 | 2 = 2) =>
  priceFormatters[fractionDigits].format(cents / 100);
/** Customer-facing names; the original flavor remains intact for SKU and editing. */
export function flavorLabel(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR")
    .replace(/\s+/g, " ");
  if (/^fru\.?\s*rojos$|^frutos rojos$/.test(key)) return "Frutos rojos";
  if (key === "anana") return "Ananá";
  if (key === "limon") return "Limón";
  if (key === "sandia") return "Sandía";
  return raw.charAt(0).toLocaleUpperCase("es-AR") + raw.slice(1);
}
/** Expand packaging abbreviations only for display; imports, SKUs and stored data stay intact. */
export const packagingLabel = (value: string) =>
  value.replace(/\bDP\b/gi, "Doypack");
export const variantLabel = (variant: Variant) =>
  [
    flavorLabel(variant.flavor),
    variant.size,
    packagingLabel(variant.presentation),
  ]
    .filter(Boolean)
    .join(" · ") || "Presentación única";

export function variantImages(
  product: Product,
  variantId: string,
): ProductImage[] {
  const specific = product.images.filter(
    (image) => image.variantId === variantId,
  );
  return (
    specific.length
      ? specific
      : product.images.filter((image) => image.variantId === null)
  )
    .slice()
    .sort((a, b) => a.position - b.position);
}
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function variantInformationImages(
  product: Product,
  variantId: string,
): ProductImage[] {
  return (product.informationImages ?? [])
    .filter(
      (image) => image.variantId === null || image.variantId === variantId,
    )
    .slice()
    .sort((a, b) => a.position - b.position);
}

export function variantTurnImages(
  product: Product,
  variantId: string,
): ProductImage[] {
  const images = product.turnImages ?? [];
  return (["left", "back", "right"] as const).flatMap((view) => {
    const specific = images.filter(
      (image) => image.variantId === variantId && image.view === view,
    );
    return (
      specific.length
        ? specific
        : images.filter(
            (image) => image.variantId === null && image.view === view,
          )
    )
      .slice()
      .sort((a, b) => a.position - b.position)
      .slice(0, 1);
  });
}

export function publicCatalog(catalog: Catalog): Catalog {
  const brands = catalog.brands.filter((item) => item.active);
  const categories = catalog.categories.filter((item) => item.active);
  return {
    revision: catalog.revision,
    brands,
    categories,
    products: catalog.products
      .filter(
        (item) =>
          item.active && brands.some((brand) => brand.id === item.brandId),
      )
      .map((item) => ({
        ...item,
        categoryIds: item.categoryIds.filter((id) =>
          categories.some((category) => category.id === id),
        ),
        variants: item.variants.filter((variant) => variant.active),
      }))
      .filter(
        (item) => item.variants.length > 0 && item.categoryIds.length > 0,
      ),
  };
}

export function validateCatalog(catalog: Catalog): string[] {
  if (
    !catalog ||
    !Number.isSafeInteger(catalog.revision) ||
    catalog.revision < 0 ||
    !Array.isArray(catalog.products) ||
    !Array.isArray(catalog.brands) ||
    !Array.isArray(catalog.categories) ||
    catalog.products.length > 2000 ||
    catalog.brands.length > 200 ||
    catalog.categories.length > 100
  )
    return ["Catálogo inválido o demasiado grande."];
  const errors: string[] = [],
    groupIds = new Set<string>(),
    groupSlugs = new Set<string>();
  if (
    catalog.lowStockThreshold !== undefined &&
    (!Number.isInteger(catalog.lowStockThreshold) ||
      catalog.lowStockThreshold < 0 ||
      catalog.lowStockThreshold > 1000000)
  )
    errors.push(
      "El umbral de stock bajo debe ser un entero entre 0 y 1000000.",
    );
  for (const [kind, groups] of [
    ["marca", catalog.brands],
    ["categoría", catalog.categories],
  ] as const) {
    for (const group of groups) {
      if (
        !group ||
        typeof group.slug !== "string" ||
        (group.detail != null && typeof group.detail !== "string") ||
        (group.logo != null && typeof group.logo !== "string")
      ) {
        errors.push(`Formato de ${kind} inválido.`);
        continue;
      }
      if (
        !group ||
        !uuid.test(group.id) ||
        typeof group.name !== "string" ||
        !group.name.trim() ||
        group.name.length > 100 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group.slug) ||
        group.slug.length > 100 ||
        typeof group.active !== "boolean" ||
        !Number.isInteger(group.sortOrder) ||
        group.sortOrder < 0 ||
        group.sortOrder > 10000 ||
        groupIds.has(group.id) ||
        groupSlugs.has(`${kind}:${group.slug}`) ||
        (group.detail?.length ?? 0) > 200 ||
        (group.logo &&
          (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/.test(
            group.logo,
          ) ||
            !group.logo.startsWith(`${group.id}/`)))
      )
        errors.push(`Revisá nombres, identificadores y URLs de ${kind}.`);
      groupIds.add(group.id);
      groupSlugs.add(`${kind}:${group.slug}`);
    }
  }
  if (errors.length) return [...new Set(errors)];
  const productIds = new Set<string>(),
    slugs = new Set<string>(),
    variantIds = new Set<string>(),
    skus = new Set<string>();
  for (const product of catalog.products) {
    try {
      errors.push(...validateProduct(product, catalog));
    } catch {
      errors.push("Formato de producto inválido.");
      continue;
    }
    if (productIds.has(product.id) || slugs.has(product.slug))
      errors.push("Hay productos o URLs repetidos.");
    productIds.add(product.id);
    slugs.add(product.slug);
    if (!Array.isArray(product.variants)) continue;
    for (const variant of product.variants ?? []) {
      if (!variant) continue;
      if (skus.has(variant.sku) || variantIds.has(variant.id))
        errors.push("Hay SKU o identificadores repetidos en el catálogo.");
      skus.add(variant.sku);
      variantIds.add(variant.id);
    }
  }
  return [...new Set(errors)];
}

export function parseMoney(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalized))
    throw new Error(
      "El precio debe ser positivo, sin separadores de miles y con hasta dos decimales.",
    );
  const [whole, decimal = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function matchingVariants(
  product: Product,
  filters: CatalogFilters,
  promotedVariantIds?: ReadonlySet<string>,
): Variant[] {
  let min: number | undefined, max: number | undefined;
  try {
    if (filters.min) min = parseMoney(filters.min);
    if (filters.max) max = parseMoney(filters.max);
  } catch {
    return [];
  }
  return product.variants.filter(
    (variant) =>
      variant.active &&
      (filters.promotion !== "active" ||
        promotedVariantIds?.has(variant.id) === true) &&
      (!filters.flavor ||
        flavorLabel(variant.flavor) === flavorLabel(filters.flavor)) &&
      (filters.availability !== "in-stock" || variant.stock > 0) &&
      (filters.availability !== "out-of-stock" || variant.stock === 0) &&
      (min === undefined || variant.listPrice >= min) &&
      (max === undefined || variant.listPrice <= max),
  );
}

export function filterCatalog(
  catalog: Catalog,
  filters: CatalogFilters,
  promotedVariantIds?: ReadonlySet<string>,
) {
  const data = publicCatalog(catalog);
  const goal = CATALOG_GOALS.find((item) => item.slug === filters.goal);
  const goalCategories = goal
    ? new Set(
        data.categories
          .filter((category) =>
            (goal.categories as readonly string[]).includes(category.slug),
          )
          .map((category) => category.id),
      )
    : null;
  const category = data.categories.find(
    (item) => item.slug === filters.category,
  );
  const terms = normalize((filters.q ?? "").slice(0, 100))
    .split(/\s+/)
    .filter(Boolean);
  return data.products
    .flatMap((product) => {
      const brand = data.brands.find((item) => item.id === product.brandId)!;
      if (
        filters.goal &&
        (!goalCategories ||
          !product.categoryIds.some((id) => goalCategories.has(id)))
      )
        return [];
      if (
        filters.category &&
        (!category || !product.categoryIds.includes(category.id))
      )
        return [];
      if (filters.brand && !filters.brand.split(",").includes(brand.slug))
        return [];
      const searchable = normalize(
        [product.name, brand.name, ...product.tags, product.description].join(
          " ",
        ),
      );
      if (
        !terms.every((term) =>
          term.length === 1
            ? searchable.split(/\W+/).includes(term)
            : searchable.includes(term),
        )
      )
        return [];
      // All filters apply to the same variant, so a price/stock match cannot come from different variants.
      const variants = matchingVariants(product, filters, promotedVariantIds);
      return variants.length
        ? [
            {
              product,
              variant: variants.reduce((a, b) =>
                a.listPrice <= b.listPrice ? a : b,
              ),
              brand,
            },
          ]
        : [];
    })
    .sort((a, b) =>
      filters.sort === "price-asc"
        ? a.variant.listPrice - b.variant.listPrice
        : filters.sort === "price-desc"
          ? b.variant.listPrice - a.variant.listPrice
          : filters.sort === "featured" &&
              a.product.featured !== b.product.featured
            ? Number(b.product.featured) - Number(a.product.featured)
            : a.product.name.localeCompare(b.product.name, "es"),
    );
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateProduct(product: Product, catalog: Catalog): string[] {
  const errors: string[] = [];
  if (
    !uuid.test(product.id) ||
    !Number.isSafeInteger(product.version) ||
    product.version < 0
  )
    errors.push("Identificador o versión inválidos.");
  if (
    !product.name?.trim() ||
    product.name.length > 140 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug ?? "") ||
    product.slug.length > 160
  )
    errors.push("Revisá el nombre y la URL del producto.");
  if (!catalog.brands.some((brand) => brand.id === product.brandId))
    errors.push("Elegí una marca existente.");
  if (
    !Array.isArray(product.categoryIds) ||
    !product.categoryIds.length ||
    new Set(product.categoryIds).size !== product.categoryIds.length ||
    product.categoryIds.some(
      (id) => !catalog.categories.some((category) => category.id === id),
    )
  )
    errors.push("Elegí categorías válidas, sin duplicados.");
  if (
    typeof product.description !== "string" ||
    product.description.length > 10000 ||
    typeof product.seoTitle !== "string" ||
    product.seoTitle.length > 140 ||
    typeof product.seoDescription !== "string" ||
    product.seoDescription.length > 320
  )
    errors.push("Revisá la descripción y los metadatos.");
  if (
    !Array.isArray(product.tags) ||
    product.tags.length > 20 ||
    product.tags.some((tag) => typeof tag !== "string" || tag.length > 60)
  )
    errors.push("Revisá las palabras clave.");
  if (
    typeof product.active !== "boolean" ||
    typeof product.featured !== "boolean"
  )
    errors.push("Estado del producto inválido.");
  if (
    !Array.isArray(product.variants) ||
    !product.variants.length ||
    product.variants.length > 100
  )
    return [...errors, "Cargá entre 1 y 100 variantes."];
  const skus = new Set<string>(),
    ids = new Set<string>();
  for (const variant of product.variants) {
    if (!uuid.test(variant.id) || ids.has(variant.id))
      errors.push("Identificadores de variantes inválidos o repetidos.");
    ids.add(variant.id);
    if (
      !/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(variant.sku ?? "") ||
      skus.has(variant.sku)
    )
      errors.push(
        "Los SKU deben ser únicos y contener de 2 a 64 letras, números, puntos o guiones.",
      );
    skus.add(variant.sku);
    if (
      catalog.products.some(
        (other) =>
          other.id !== product.id &&
          other.variants.some((item) => item.sku === variant.sku),
      )
    )
      errors.push(`El SKU ${variant.sku} ya pertenece a otro producto.`);
    if (
      [variant.listPrice, variant.cashPrice].some(
        (price) =>
          !Number.isSafeInteger(price) || price <= 0 || price > 99999999999,
      )
    )
      errors.push("Ingresá precios positivos, en centavos.");
    if (
      !Number.isSafeInteger(variant.stock) ||
      variant.stock < 0 ||
      variant.stock > 1000000
    )
      errors.push("El stock debe ser un entero entre 0 y 1000000.");
    if (
      [variant.flavor, variant.size, variant.presentation].some(
        (value) => typeof value !== "string" || value.length > 100,
      ) ||
      typeof variant.active !== "boolean"
    )
      errors.push("Revisá los atributos de las variantes.");
  }
  if (!Array.isArray(product.images) || product.images.length > 12)
    return [...errors, "Se permiten hasta 12 imágenes."];
  if (
    product.informationImages !== undefined &&
    (!Array.isArray(product.informationImages) ||
      product.informationImages.length > 12)
  )
    return [...errors, "Se permiten hasta 12 fichas informativas."];
  const imageIds = new Set<string>();
  if (
    product.turnImages !== undefined &&
    (!Array.isArray(product.turnImages) || product.turnImages.length > 24)
  )
    return [...errors, "Se permiten hasta 24 vistas del envase."];
  for (const image of product.turnImages ?? []) {
    if (!["left", "back", "right"].includes(image.view ?? ""))
      errors.push(
        "Elegí costado izquierdo, dorso o costado derecho para cada vista.",
      );
  }
  for (const image of [
    ...product.images,
    ...(product.informationImages ?? []),
    ...(product.turnImages ?? []),
  ]) {
    if (
      !uuid.test(image.id) ||
      imageIds.has(image.id) ||
      !validImagePath(image.path) ||
      !image.path.startsWith(`${product.id}/`) ||
      typeof image.alt !== "string" ||
      !image.alt.trim() ||
      image.alt.length > 200 ||
      !Number.isInteger(image.position) ||
      image.position < 0 ||
      image.position > ((product.turnImages ?? []).includes(image) ? 23 : 11) ||
      (image.variantId !== null && !ids.has(image.variantId))
    )
      errors.push("Revisá el archivo, texto y variante de cada imagen.");
    imageIds.add(image.id);
  }
  return [...new Set(errors)];
}
