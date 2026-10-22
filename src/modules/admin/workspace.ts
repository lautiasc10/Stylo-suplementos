import "server-only";
import { requireAdmin } from "./access";
import { getCatalog } from "@/modules/catalog/server";
import { readPromotions } from "@/modules/commerce/promotions-server";
import type { OrderRecord } from "@/modules/commerce/orders";
import type { Catalog } from "@/modules/catalog/model";
import type { PromotionState } from "@/modules/commerce/promotions";
import { buenosAiresMonthBounds, paidSalesAmount } from "./monthly-sales";

export type AdminWorkspaceData = {
  catalog: Catalog | null;
  promotions: PromotionState | null;
  orders: OrderRecord[] | null;
  monthlySales: { amount: number; count: number } | null;
};

async function readMonthlySales(client: Awaited<ReturnType<typeof requireAdmin>>["client"]) {
  const { start, end } = buenosAiresMonthBounds(new Date());
  let amount = 0;
  let count = 0;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("commerce_orders")
      .select("snapshot")
      .eq("payment_status", "paid")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) return null;
    count += data.length;
    amount += paidSalesAmount(data);
    if (data.length < 1000) return { amount, count };
  }
}

export async function readAdminWorkspace(): Promise<AdminWorkspaceData> {
  const { client } = await requireAdmin();
  // Verify access before starting any read of private orders. Load independent
  // resources together once rather than repeating them at each sidebar click.
  const [catalog, promotions, orders, monthlySales] = await Promise.all([
    getCatalog(),
    readPromotions(),
    client
      .from("commerce_orders")
      .select("id,customer,snapshot,created_at,payment_status")
      .order("created_at", { ascending: false })
      .limit(50),
    readMonthlySales(client),
  ]);
  return {
    catalog: catalog.error ? null : catalog.catalog,
    promotions: promotions.error ? null : promotions.state,
    orders: orders.error ? null : (orders.data as OrderRecord[]),
    monthlySales,
  };
}
