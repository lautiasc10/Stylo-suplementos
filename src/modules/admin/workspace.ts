import "server-only";
import { requireAdmin } from "./access";
import { getCatalog } from "@/modules/catalog/server";
import { readPromotions } from "@/modules/commerce/promotions-server";
import type { OrderRecord } from "@/modules/commerce/orders";
import type { Catalog } from "@/modules/catalog/model";
import type { PromotionState } from "@/modules/commerce/promotions";

export type AdminWorkspaceData = {
  catalog: Catalog | null;
  promotions: PromotionState | null;
  orders: OrderRecord[] | null;
};

export async function readAdminWorkspace(): Promise<AdminWorkspaceData> {
  const { client } = await requireAdmin();
  // Verify access before starting any read of private orders. Load independent
  // resources together once rather than repeating them at each sidebar click.
  const [catalog, promotions, orders] = await Promise.all([
    getCatalog(),
    readPromotions(),
    client
      .from("commerce_orders")
      .select("id,customer,snapshot,created_at,payment_status")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return {
    catalog: catalog.error ? null : catalog.catalog,
    promotions: promotions.error ? null : promotions.state,
    orders: orders.error ? null : (orders.data as OrderRecord[]),
  };
}
