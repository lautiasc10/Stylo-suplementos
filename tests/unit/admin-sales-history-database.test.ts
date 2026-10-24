import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, test } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";

const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111";
const outsider = "22222222-2222-4222-8222-222222222222";
const catalog = demoCatalog();
const variant = catalog.products[0].variants[0];
const orderId = "44444444-4444-4444-8444-444444444444";

async function as<T>(id: string | null, aal: string, fn: () => Promise<T>) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, aal })]);
    await db.exec(`set local role ${id ? "authenticated" : "anon"}`);
    return await fn();
  } finally { await db.exec("rollback"); }
}

beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema public,auth,storage to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);alter table storage.objects enable row level security;`);
  for (const name of ["202610100001_foundations.sql", "202610100002_catalog.sql", "202610110001_commerce.sql", "202610110002_manual_cash_sales.sql", "202610200001_promotion_limits.sql", "202610240002_admin_sales_history.sql"])
    await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
  await db.query("insert into auth.users values($1),($2)", [admin, outsider]);
  await db.query("insert into public.admin_users(user_id) values($1)", [admin]);
  await db.exec("begin");
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: admin, aal: "aal2" })]);
  await db.exec("set local role authenticated");
  await db.query("select public.save_catalog($1::jsonb,0)", [JSON.stringify(catalog)]);
  await db.exec("commit");
}, 30000);
afterAll(async () => { await db.close(); });

test("costos privados y resumen requieren admin MFA", async () => {
  for (const [id, aal] of [[null, ""], [outsider, "aal2"], [admin, "aal1"]] as const) {
    await as(id, aal, async () => {
      if (!id) await expect(db.query("select * from public.catalog_variant_costs")).rejects.toMatchObject({ code: "42501" });
      else expect((await db.query("select * from public.catalog_variant_costs")).rows).toEqual([]);
    });
    await as(id, aal, async () => { await expect(db.query("select public.set_variant_purchase_cost($1,200000)", [variant.id])).rejects.toMatchObject({ code: "42501" }); });
    await as(id, aal, async () => { await expect(db.query("select public.complete_manual_pickup_order($1,true)", [orderId])).rejects.toMatchObject({ code: "42501" }); });
    await as(id, aal, async () => {
      if (!id) await expect(db.query("select public.admin_sales_summary()")).rejects.toMatchObject({ code: "42501" });
      else expect((await db.query<{ admin_sales_summary: unknown }>("select public.admin_sales_summary()")).rows[0].admin_sales_summary).toBeNull();
    });
  }
});

test("retiro pendiente se cobra y descuenta una vez; captura costo del momento", async () => {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: admin, aal: "aal2" })]);
    await db.exec("set local role authenticated");
    await db.query("select public.set_variant_purchase_cost($1,150000)", [variant.id]);
    const created = await db.query<{ create_manual_pickup_order: { id: string } }>("select public.create_manual_pickup_order($1,$2::jsonb,$3::jsonb)", [orderId, JSON.stringify([{ variantId: variant.id, quantity: 2 }]), JSON.stringify({ name: "Cliente de prueba", phone: "" })]);
    const id = created.rows[0].create_manual_pickup_order.id;
    const pending = await db.query<{ stock: number }>("select stock from public.catalog_variants where id=$1", [variant.id]);
    expect(pending.rows[0].stock).toBe(variant.stock);
    await db.query("select public.complete_manual_pickup_order($1,true)", [id]);
    await db.query("select public.complete_manual_pickup_order($1,true)", [id]);
    const completed = await db.query<{ payment_status: string; fulfillment_status: string; paid_at: string; picked_up_at: string; cost_total: number }>("select payment_status,fulfillment_status,paid_at,picked_up_at,cost_total from public.commerce_orders where id=$1", [id]);
    expect(completed.rows[0]).toMatchObject({ payment_status: "paid", fulfillment_status: "picked_up", cost_total: 300000 });
    expect(completed.rows[0].paid_at).toBeTruthy();
    expect(completed.rows[0].picked_up_at).toBeTruthy();
    const stock = await db.query<{ stock: number }>("select stock from public.catalog_variants where id=$1", [variant.id]);
    expect(stock.rows[0].stock).toBe(variant.stock - 2);
    const movements = await db.query<{ count: number }>("select count(*)::int as count from public.inventory_movements where reason='manual_pickup_collected'");
    expect(movements.rows[0].count).toBe(1);
    const summary = await db.query<{ admin_sales_summary: { history: { sales: number; revenue: number; profit: number; missing_costs: number }[]; pendingPickups: number } }>("select public.admin_sales_summary()");
    const month = summary.rows[0].admin_sales_summary.history.at(-1)!;
    expect(month).toMatchObject({ sales: 1, revenue: 8200000, profit: 7900000, missing_costs: 0 });
    expect(summary.rows[0].admin_sales_summary.pendingPickups).toBe(0);
    await db.query("select public.set_variant_purchase_cost($1,250000)", [variant.id]);
    const frozen = await db.query<{ cost_total: number }>("select cost_total from public.commerce_orders where id=$1", [id]);
    expect(frozen.rows[0].cost_total).toBe(300000);
  } finally { await db.exec("rollback"); }
});

test("stock insuficiente revierte todo y deja el retiro pendiente", async () => {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: admin, aal: "aal2" })]);
    await db.exec("set local role authenticated");
    const result = await db.query<{ create_manual_pickup_order: { id: string } }>("select public.create_manual_pickup_order($1,$2::jsonb,$3::jsonb)", [orderId, JSON.stringify([{ variantId: variant.id, quantity: 2 }]), JSON.stringify({ name: "Cliente de prueba", phone: "" })]);
    const id = result.rows[0].create_manual_pickup_order.id;
    // Direct catalog edits are forbidden under authenticated; simulate another stock change as owner.
    await db.exec("reset role");
    await db.query("update public.catalog_variants set stock=1 where id=$1", [variant.id]);
    await db.exec("set local role authenticated");
    await db.exec("savepoint before_pickup");
    await expect(db.query("select public.complete_manual_pickup_order($1,true)", [id])).rejects.toMatchObject({ code: "23514" });
    await db.exec("rollback to savepoint before_pickup");
    const pending = await db.query<{ payment_status: string }>("select payment_status from public.commerce_orders where id=$1", [id]);
    expect(pending.rows[0].payment_status).toBe("pending");
    const stock = await db.query<{ stock: number }>("select stock from public.catalog_variants where id=$1", [variant.id]);
    expect(stock.rows[0].stock).toBe(1);
  } finally { await db.exec("rollback"); }
});

test("una venta sin costo no produce una ganancia ficticia", async () => {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: admin, aal: "aal2" })]);
    await db.exec("set local role authenticated");
    await db.query("select public.create_manual_cash_sale($1,$2::jsonb,$3::jsonb,true)", [orderId, JSON.stringify([{ variantId: variant.id, quantity: 1 }]), JSON.stringify({ name: "Caja de prueba", phone: "" })]);
    const summary = await db.query<{ admin_sales_summary: { history: { sales: number; profit: number | null; missing_costs: number }[] } }>("select public.admin_sales_summary()");
    expect(summary.rows[0].admin_sales_summary.history.at(-1)).toMatchObject({ sales: 1, profit: null, missing_costs: 1 });
  } finally { await db.exec("rollback"); }
});
