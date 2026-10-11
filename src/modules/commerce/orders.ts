import { quoteCart, merchandiseTotal, parseCart, type CartItem } from "./cart";
import type { Promotion } from "./promotions";
import type { Catalog } from "@/modules/catalog/model";
export type ManualOrderInput = {
  requestId: string;
  items: CartItem[];
  customer: { name: string; phone: string };
};
export function validateManualOrder(input: ManualOrderInput) {
  if (
    !input ||
    !/^[0-9a-f-]{36}$/i.test(input.requestId) ||
    typeof input.customer?.name !== "string" ||
    !input.customer.name.trim() ||
    input.customer.name.length > 100 ||
    typeof input.customer.phone !== "string" ||
    input.customer.phone.length > 30 ||
    !input.items?.length ||
    parseCart(input.items).length !== input.items.length
  )
    return "Revisá el cliente y las presentaciones del pedido.";
  return null;
}
export function previewManualOrder(
  catalog: Catalog,
  promotions: Promotion[],
  input: ManualOrderInput,
) {
  const invalid = validateManualOrder(input);
  if (invalid) throw new Error(invalid);
  const quote = quoteCart(catalog, input.items, promotions);
  if (!quote.valid) throw new Error(quote.issues.join(" "));
  return {
    id: input.requestId,
    source: "manual" as const,
    paymentStatus: "pending" as const,
    fulfillmentStatus: "pending_pickup" as const,
    customer: { ...input.customer },
    total: merchandiseTotal(quote, "efectivo"),
    snapshot: structuredClone(quote),
    createdAt: new Date().toISOString(),
  };
}
