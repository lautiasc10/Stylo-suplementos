"use server";
import { requireAdmin } from "./access";
import { parseMoney } from "@/modules/catalog/model";
import { revalidatePath } from "next/cache";

export async function readPurchaseCosts(): Promise<{ costs: Record<string, number>; error?: string }> {
  const { client } = await requireAdmin();
  const { data, error } = await client.from("catalog_variant_costs").select("variant_id,unit_cost");
  if (error) return { costs: {}, error: "No pudimos consultar los costos. Revisá la migración del panel." };
  return { costs: Object.fromEntries((data ?? []).map((row) => [row.variant_id, Number(row.unit_cost)])) };
}

export async function savePurchaseCost(variantId: string, value: string) {
  const { client } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(variantId)) return { error: "Presentación inválida." };
  let cost: number | null = null;
  try { if (value.trim()) cost = parseMoney(value); }
  catch { return { error: "Ingresá un costo válido, sin separadores de miles." }; }
  const { error } = await client.rpc("set_variant_purchase_cost", { p_variant_id: variantId, p_unit_cost: cost });
  if (error) return { error: "No pudimos guardar el costo. Revisá la migración del panel." };
  revalidatePath("/admin/catalogo");
  return { cost };
}
