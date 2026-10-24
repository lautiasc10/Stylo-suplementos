import { quoteCart, merchandiseTotal, parseCart, type CartItem } from "./cart";
import type { Promotion } from "./promotions";
import type { Catalog } from "@/modules/catalog/model";
export type OrderRecord = {
  id: string;
  customer: { name: string; phone?: string };
  snapshot: {
    total: number;
    base?: number;
    discount?: number;
    promotion?: string | null;
    paymentMethod?: string;
    lines?: {
      variantId: string;
      name: string;
      quantity: number;
      label?: string;
      flavor?: string;
      size?: string;
      presentation?: string;
      sku?: string;
      unitPrice?: number;
      subtotal?: number;
    }[];
  };
  created_at: string;
  operation_at?: string;
  paid_at?: string | null;
  picked_up_at?: string | null;
  payment_status?: string;
  fulfillment_status?: string;
  fee_total?: number;
  expense_total?: number;
  refund_total?: number;
  cost_total?: number | null;
};
export type ManualOrderInput = {
  requestId: string;
  items: CartItem[];
  customer: { name: string; phone: string };
  kind?: "pickup" | "cash-sale";
  received?: boolean;
};
export function validateManualOrder(input: ManualOrderInput) {
  if (
    !input ||
    (input.kind !== undefined &&
      !["pickup", "cash-sale"].includes(input.kind)) ||
    (input.kind === "cash-sale" && input.received !== true) ||
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
    paymentStatus: input.kind === "cash-sale" ? "paid" : "pending",
    fulfillmentStatus:
      input.kind === "cash-sale" ? "delivered" : "pending_pickup",
    customer: { ...input.customer },
    total: merchandiseTotal(quote, "efectivo"),
    snapshot: structuredClone(quote),
    createdAt: new Date().toISOString(),
  };
}
