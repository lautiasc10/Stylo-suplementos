import "server-only";
import { requireAdmin } from "./access";
import { getCatalog } from "@/modules/catalog/server";
import { readPromotions } from "@/modules/commerce/promotions-server";
import type { OrderRecord } from "@/modules/commerce/orders";
import type { Catalog } from "@/modules/catalog/model";
import type { PromotionState } from "@/modules/commerce/promotions";
import type { SalesSummary } from "./sales-history";

export type AdminWorkspaceData = {
  catalog: Catalog | null;
  promotions: PromotionState | null;
  orders: OrderRecord[] | null;
  monthlySales: SalesSummary | null;
};

export async function readAdminWorkspace(): Promise<AdminWorkspaceData> {
  const { client } = await requireAdmin();
  // Verify access before starting any read of private orders. Load independent
  // resources together once rather than repeating them at each sidebar click.
  const [catalog, promotions, monthlySales] = await Promise.all([
    getCatalog(),
    readPromotions(),
    client.rpc("admin_sales_summary"),
  ]);
  return {
    catalog: catalog.error ? null : catalog.catalog,
    promotions: promotions.error ? null : promotions.state,
    orders: [] as OrderRecord[],
    monthlySales: monthlySales.error || !monthlySales.data ? null : monthlySales.data as SalesSummary,
  };
}
