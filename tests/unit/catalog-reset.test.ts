import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const resetSql = readFileSync(
  "supabase/manual/20261016_reset_initial_products.sql",
  "utf8",
);

describe("limpieza controlada del catálogo inicial", () => {
  it("rechaza retiros pendientes y luego conserva una copia antes de borrar los cuatro productos", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create role anon; create role authenticated;
        create schema auth; create schema storage;
        create table auth.users(id uuid primary key);
        create function auth.jwt() returns jsonb language sql stable as $$
          select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
        $$;
        create function auth.uid() returns uuid language sql stable as $$
          select (auth.jwt()->>'sub')::uuid
        $$;
        grant usage on schema public,auth,storage to anon,authenticated;
        create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
        create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);
        alter table storage.objects enable row level security;
      `);
      for (const name of [
        "202610100001_foundations.sql",
        "202610100002_catalog.sql",
        "202610110001_commerce.sql",
      ])
        await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
      const admin = "11111111-1111-4111-8111-111111111111";
      const brand = "22222222-2222-4222-8222-222222222222";
      await db.query("insert into auth.users(id) values($1)", [admin]);
      await db.query("insert into public.admin_users(user_id) values($1)", [
        admin,
      ]);
      await db.query(
        "insert into public.catalog_brands(id,slug,name,active,sort_order) values($1,'marca-star','STAR NUTRITION',true,0)",
        [brand],
      );
      for (const [index, slug] of [
        "creatina",
        "mutant-mass",
        "whey-protein",
        "zma",
      ].entries()) {
        const productId = `33333333-3333-4333-8333-${String(index + 1).padStart(12, "0")}`;
        await db.query(
          "insert into public.catalog_products(id,slug,brand_id,active,document) values($1,$2,$3,true,'{}'::jsonb)",
          [productId, slug, brand],
        );
        for (let n = 0; n < [1, 4, 3, 1][index]; n++) {
          const variantId = `44444444-4444-4444-8444-${String(index * 4 + n + 1).padStart(12, "0")}`;
          await db.query(
            "insert into public.catalog_variants(id,product_id,sku,active,list_price,cash_price,stock,document) values($1,$2,$3,true,100,90,0,'{}'::jsonb)",
            [variantId, productId, `TEST-${index}-${n}`],
          );
        }
      }
      const variantId = "44444444-4444-4444-8444-000000000001";
      await db.query(
        "insert into public.commerce_orders(id,request_id,source,payment_status,fulfillment_status,customer,request_payload,snapshot,admin_id) values(gen_random_uuid(),gen_random_uuid(),'manual','pending','pending_pickup','{}'::jsonb,'{}'::jsonb,$1::jsonb,$2)",
        [JSON.stringify({ lines: [{ variantId }] }), admin],
      );
      await expect(db.exec(resetSql)).rejects.toThrow(/retiros pendientes/);
      await db.exec("rollback");
      expect(
        (await db.query("select id from public.catalog_products")).rows,
      ).toHaveLength(4);
      await db.exec("delete from public.commerce_orders");
      await db.exec(resetSql);
      expect(
        (await db.query("select id from public.catalog_products")).rows,
      ).toHaveLength(0);
      expect(
        (await db.query("select id from public.catalog_variants")).rows,
      ).toHaveLength(0);
      const backups = await db.query<{
        snapshot: { products: unknown[]; variants: unknown[] };
      }>("select snapshot from public.catalog_reset_backups");
      expect(backups.rows[0].snapshot.products).toHaveLength(4);
      expect(backups.rows[0].snapshot.variants).toHaveLength(9);
    } finally {
      await db.close();
    }
  }, 30000);
});
