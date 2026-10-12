import { publicCatalog, variantLabel, variantImages, type Catalog, type ProductImage } from "../catalog/model";
import { priceLines, type Pricing, type Promotion } from "./promotions";

export type CartItem = { variantId: string; quantity: number };
export type CartLine = CartItem & {
  name: string;
  slug: string;
  sku: string;
  label: string;
  stock: number;
  listPrice: number;
  cashPrice: number;
  available: boolean;
  image?: Pick<ProductImage, "path" | "alt">;
  brand?: string;
};
export type CartQuote = {
  lines: CartLine[];
  issues: string[];
  listSubtotal: number;
  cashSubtotal: number;
  quantity: number;
  valid: boolean;
  listPricing: Pricing;
  cashPricing: Pricing;
};
export const cartLimit = 30;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only identifiers and quantities are persisted. Prices always come from the catalog.
export function parseCart(value: unknown): CartItem[] {
  if (!Array.isArray(value) || value.length > cartLimit) return [];
  const seen = new Set<string>();
  const result: CartItem[] = [];
  for (const item of value) {
    if (
      !item ||
      typeof item.variantId !== "string" ||
      !uuid.test(item.variantId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 999 ||
      seen.has(item.variantId)
    )
      return [];
    seen.add(item.variantId);
    result.push({ variantId: item.variantId, quantity: item.quantity });
  }
  return result;
}

export function quoteCart(
  catalog: Catalog,
  items: CartItem[],
  promotions: Promotion[] = [],
): CartQuote {
  const visible = publicCatalog(catalog);
  const lines: CartLine[] = [];
  const issues: string[] = [];
  for (const item of items) {
    const product = visible.products.find((product) =>
      product.variants.some((v) => v.id === item.variantId),
    );
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) {
      issues.push(
        "Una presentación dejó de estar disponible. Quitala del carrito para continuar.",
      );
      lines.push({
        ...item,
        name: "Presentación no disponible",
        slug: "",
        sku: "",
        label: "Producto retirado del catálogo",
        stock: 0,
        listPrice: 0,
        cashPrice: 0,
        available: false,
      });
      continue;
    }
    const available = variant.stock >= item.quantity;
    const image = variantImages(product, variant.id)[0];
    if (!available)
      issues.push(
        `Revisá la cantidad de ${product.name}: quedan ${variant.stock} unidades.`,
      );
    lines.push({
      ...item,
      name: product.name,
      slug: product.slug,
      sku: variant.sku,
      label: variantLabel(variant),
      stock: variant.stock,
      listPrice: variant.listPrice,
      cashPrice: variant.cashPrice,
      available,
      image: image ? { path: image.path, alt: image.alt } : undefined,
      brand: visible.brands.find((brand) => brand.id === product.brandId)?.name,
    });
  }
  const sum = (field: "listPrice" | "cashPrice") =>
    lines.reduce((total, line) => total + line[field] * line.quantity, 0);
  const listSubtotal = sum("listPrice"),
    cashSubtotal = sum("cashPrice");
  if (
    !Number.isSafeInteger(listSubtotal) ||
    !Number.isSafeInteger(cashSubtotal)
  )
    issues.push("El importe supera el límite permitido.");
  return {
    lines,
    issues: [...new Set(issues)],
    listSubtotal,
    cashSubtotal,
    quantity: items.reduce((total, item) => total + item.quantity, 0),
    valid: items.length > 0 && issues.length === 0,
    listPricing: priceLines(lines, promotions, "mercado-pago"),
    cashPricing: priceLines(lines, promotions, "transferencia"),
  };
}

export function changeCart(
  catalog: Catalog,
  items: CartItem[],
  variantId: string,
  operation: string,
  quantity: number,
): { items: CartItem[]; error?: string } {
  if (!uuid.test(variantId) || !["add", "set", "remove"].includes(operation))
    return { items, error: "La presentación o la acción no es válida." };
  if (operation === "remove")
    return { items: items.filter((item) => item.variantId !== variantId) };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    return { items, error: "Elegí una cantidad entera entre 1 y 999." };
  const current = items.find((item) => item.variantId === variantId);
  const nextQuantity =
    operation === "add" ? (current?.quantity ?? 0) + quantity : quantity;
  const variant = publicCatalog(catalog)
    .products.flatMap((product) => product.variants)
    .find((v) => v.id === variantId);
  if (!variant || nextQuantity > variant.stock || nextQuantity > 999)
    return { items, error: "No hay stock suficiente para esa cantidad." };
  if (!current && items.length >= cartLimit)
    return {
      items,
      error: "El carrito admite hasta 30 presentaciones diferentes.",
    };
  return {
    items: current
      ? items.map((item) =>
          item.variantId === variantId
            ? { variantId, quantity: nextQuantity }
            : item,
        )
      : [...items, { variantId, quantity: nextQuantity }],
  };
}

export type PaymentMethod = "mercado-pago" | "transferencia" | "efectivo";
export function merchandiseTotal(quote: CartQuote, method: PaymentMethod) {
  return method === "mercado-pago"
    ? quote.listPricing.total
    : quote.cashPricing.total;
}

export function validateGuest(input: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!input.name?.trim() || input.name.length > 100)
    errors.push("Ingresá tu nombre y apellido.");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email ?? "") ||
    input.email.length > 254
  )
    errors.push("Ingresá un correo válido.");
  if (!/^\+?[0-9 ()-]{6,30}$/.test(input.phone ?? ""))
    errors.push("Ingresá un teléfono válido.");
  if (!/^[0-9]{7,8}$/.test(input.dni ?? ""))
    errors.push("Ingresá un DNI de 7 u 8 dígitos.");
  if ((input.notes?.length ?? 0) > 500)
    errors.push("Las notas admiten hasta 500 caracteres.");
  return errors;
}
