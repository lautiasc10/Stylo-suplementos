"use server";
import { requireAdmin } from "./access";
import { salesPeriodBounds, salesQueryValid, type SalesQuery } from "./sales-history";
import type { OrderRecord } from "@/modules/commerce/orders";
import { revalidatePath } from "next/cache";

export async function readSalesPage(query: SalesQuery): Promise<{ rows: OrderRecord[]; total: number; error?: string }> {
  const { client } = await requireAdmin();
  if (!salesQueryValid(query)) return { rows: [], total: 0, error: "Revisá los filtros y las fechas." };
  const bounds = salesPeriodBounds(query.period, new Date(), query.from, query.to)!;
  let request = client.from("commerce_orders")
    .select("id,customer,snapshot,created_at,operation_at,paid_at,picked_up_at,payment_status,fulfillment_status,cost_total,fee_total,expense_total,refund_total", { count: "exact" })
    .gte("operation_at", bounds.start).lt("operation_at", bounds.end);
  if (query.status !== "all") request = request.eq("payment_status", query.status);
  const search = query.search.trim().replaceAll("%", "\\%").replaceAll("_", "\\_");
  if (search) request = request.ilike("customer_name", `%${search}%`);
  const { data, count, error } = await request.order("operation_at", { ascending: false }).order("id", { ascending: false }).range(query.page * 10, query.page * 10 + 9);
  if (error) return { rows: [], total: 0, error: "No pudimos consultar el historial. Revisá la migración del panel." };
  return { rows: (data ?? []) as OrderRecord[], total: count ?? 0 };
}

export async function collectManualPickup(id: string, received: boolean) {
  const { client } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id) || received !== true) return { error: "Confirmá el cobro y el retiro." };
  const { data, error } = await client.rpc("complete_manual_pickup_order", { p_order_id: id, p_received: true });
  if (error) return { error: error.code === "23514" ? "No hay stock suficiente para completar el retiro. Revisá las existencias." : "No pudimos marcar el pedido como retirado. Reintentá o revisá su estado." };
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { result: data as { id: string; paidAt: string; pickedUpAt: string } };
}
