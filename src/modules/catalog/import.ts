import {
  parseMoney,
  validateCatalog,
  type Catalog,
  type Product,
  type Variant,
} from "./model";
export const importColumns = [
  "producto_slug",
  "nombre",
  "marca",
  "categorias",
  "descripcion",
  "sku",
  "sabor",
  "tamano",
  "presentacion",
  "precio_lista",
  "precio_efectivo",
  "stock",
  "visible",
] as const;
export type ImportChange = {
  product: Product;
  before?: Variant;
  after: Variant;
};
export type ImportPlan = {
  catalog: Catalog;
  errors: string[];
  created: number;
  updated: number;
  rows: number;
  changes: ImportChange[];
};

export function parseCsv(source: string): string[][] {
  if (source.length > 2 * 1024 * 1024)
    throw new Error("El archivo supera 2 MB.");
  const text = source.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0];
  const delimiter = first.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else value += char;
    } else if (char === '"') {
      if (value || closed) throw new Error("Comillas inválidas en CSV.");
      quoted = true;
    } else if (char === delimiter || char === "\n" || char === "\r") {
      row.push(value);
      value = "";
      closed = false;
      if (char !== delimiter) {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === "\r" && text[i + 1] === "\n") i++;
      }
    } else {
      if (closed) throw new Error("Contenido después de cerrar comillas.");
      value += char;
    }
    if (rows.length > 1000 || row.length > 30 || value.length > 10000)
      throw new Error(
        "El archivo supera el límite de filas, columnas o texto.",
      );
  }
  if (quoted) throw new Error("Hay comillas sin cerrar.");
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function planImport(data: unknown[][], current: Catalog): ImportPlan {
  const catalog: Catalog = structuredClone(current);
  const result: ImportPlan = {
    catalog,
    errors: [],
    created: 0,
    updated: 0,
    rows: Math.max(0, data.length - 1),
    changes: [],
  };
  if (data.length < 2 || data.length > 1001)
    return { ...result, errors: ["Cargá entre 1 y 1000 filas de datos."] };
  const headers = data[0].map((cell) => String(cell ?? "").trim());
  if (
    new Set(headers).size !== headers.length ||
    importColumns.some((column) => !headers.includes(column)) ||
    headers.some(
      (column) => !(importColumns as readonly string[]).includes(column),
    )
  )
    return {
      ...result,
      errors: ["Las columnas no coinciden con la plantilla."],
    };
  const seen = new Set<string>(),
    definitions = new Map<string, string>();
  data.slice(1).forEach((cells, index) => {
    try {
      if (
        cells.length > headers.length ||
        cells.some(
          (cell) =>
            cell instanceof Date || (typeof cell === "object" && cell !== null),
        )
      )
        throw new Error("Tipos de celda inválidos.");
      const row = Object.fromEntries(
        headers.map((header, position) => [
          header,
          String(cells[position] ?? "").trim(),
        ]),
      );
      const sku = row.sku.toUpperCase();
      if (seen.has(sku)) throw new Error(`SKU ${sku} duplicado en el archivo.`);
      seen.add(sku);
      const brand = catalog.brands.find((item) => item.slug === row.marca);
      const categories = row.categorias
        .split("|")
        .map((slug) => catalog.categories.find((item) => item.slug === slug));
      if (!brand || !categories.length || categories.some((item) => !item))
        throw new Error("La marca o categoría no existe; cargala primero.");
      const definition = JSON.stringify([
        row.nombre,
        row.marca,
        row.categorias,
        row.descripcion,
        row.visible,
      ]);
      if (
        definitions.has(row.producto_slug) &&
        definitions.get(row.producto_slug) !== definition
      )
        throw new Error(
          "Las filas del mismo producto tienen datos contradictorios.",
        );
      definitions.set(row.producto_slug, definition);
      if (!/^(true|false)$/.test(row.visible) || !/^\d{1,7}$/.test(row.stock))
        throw new Error(
          "visible debe ser true/false y stock un entero no negativo.",
        );
      let product = catalog.products.find(
        (item) => item.slug === row.producto_slug,
      );
      const owner = catalog.products.find((item) =>
        item.variants.some((variant) => variant.sku === sku),
      );
      if (owner && owner.id !== product?.id)
        throw new Error("No se puede mover un SKU a otro producto.");
      if (!product) {
        product = {
          id: crypto.randomUUID(),
          slug: row.producto_slug,
          name: row.nombre,
          brandId: brand.id,
          categoryIds: categories.map((item) => item!.id),
          description: row.descripcion,
          active: row.visible === "true",
          featured: false,
          tags: [],
          seoTitle: row.nombre,
          seoDescription: "",
          version: 0,
          variants: [],
          images: [],
        };
        catalog.products.push(product);
      } else {
        product.name = row.nombre;
        product.brandId = brand.id;
        product.categoryIds = categories.map((item) => item!.id);
        product.description = row.descripcion;
        product.active = row.visible === "true";
      }
      const existing = product.variants.find((item) => item.sku === sku);
      const variant = {
        id: existing?.id ?? crypto.randomUUID(),
        sku,
        flavor: row.sabor,
        size: row.tamano,
        presentation: row.presentacion,
        listPrice: parseMoney(row.precio_lista),
        cashPrice: parseMoney(row.precio_efectivo),
        stock: Number(row.stock),
        active: existing?.active ?? true,
      };
      result.changes.push({
        product,
        before: existing ? { ...existing } : undefined,
        after: variant,
      });
      if (existing) {
        Object.assign(existing, variant);
        result.updated++;
      } else {
        product.variants.push(variant);
        result.created++;
      }
    } catch (error) {
      result.errors.push(
        `Fila ${index + 2}: ${error instanceof Error ? error.message : "Datos inválidos."}`,
      );
    }
  });
  result.errors.push(...validateCatalog(catalog));
  return result.errors.length
    ? { ...result, catalog: structuredClone(current) }
    : result;
}

// Reject oversized ZIP content before the Excel reader decompresses it.
export function validateXlsxArchive(bytes: Uint8Array) {
  if (bytes.length > 2 * 1024 * 1024 || bytes.length < 22)
    throw new Error("Excel inválido o mayor a 2 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      view.getUint32(i, true) === 0x06054b50 &&
      i + 22 + view.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  if (
    end < 0 ||
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0
  )
    throw new Error("Excel comprimido inválido.");
  const count = view.getUint16(end + 10, true),
    size = view.getUint32(end + 12, true),
    start = view.getUint32(end + 16, true);
  if (count > 500 || start + size !== end)
    throw new Error("Excel demasiado complejo o inválido.");
  let offset = start,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (
      offset + 46 > end ||
      view.getUint32(offset, true) !== 0x02014b50 ||
      view.getUint16(offset + 8, true) & 1
    )
      throw new Error("Excel inválido o cifrado.");
    const expanded = view.getUint32(offset + 24, true);
    total += expanded;
    if (expanded > 10 * 1024 * 1024 || total > 20 * 1024 * 1024)
      throw new Error("El contenido descomprimido de Excel supera el límite.");
    offset +=
      46 +
      view.getUint16(offset + 28, true) +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
  }
  if (offset !== end) throw new Error("Directorio Excel inválido.");
}

export async function readImportFile(file: File): Promise<unknown[][]> {
  if (file.size > 2 * 1024 * 1024) throw new Error("El archivo supera 2 MB.");
  if (file.name.toLowerCase().endsWith(".csv"))
    return parseCsv(await file.text());
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    throw new Error("Elegí un archivo CSV o Excel .xlsx.");
  const bytes = await file.arrayBuffer();
  validateXlsxArchive(new Uint8Array(bytes));
  const { readSheet } = await import("read-excel-file/universal");
  return readSheet(bytes, { parseNumber: (value) => value });
}
