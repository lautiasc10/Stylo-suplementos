import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import type { Catalog } from "../../src/modules/catalog/model";
const db = new PGlite(),
  admin = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
async function asRole<T>(id: string | null, aal: string, fn: () => Promise<T>) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: id, aal }),
    ]);
    await db.exec(`set local role ${id ? "authenticated" : "anon"}`);
    return await fn();
  } finally {
    await db.exec("rollback");
  }
}
const save = (catalog: Catalog, revision = 1) =>
  db.query<{ save_catalog: number }>(
    "select public.save_catalog($1::jsonb,$2)",
    [JSON.stringify(catalog), revision],
  );
const snapshot = async () =>
  (
    await db.query<{ catalog_snapshot: Catalog }>(
      "select public.catalog_snapshot()",
    )
  ).rows[0].catalog_snapshot;
describe("migración de catálogo, transacciones y permisos", () => {
  beforeAll(async () => {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      grant usage on schema public,auth,storage to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);alter table storage.objects enable row level security;`);
    await db.exec(
      readFileSync("supabase/migrations/202610100001_foundations.sql", "utf8"),
    );
    await db.exec(
      readFileSync("supabase/migrations/202610100002_catalog.sql", "utf8"),
    );
    await db.query("insert into auth.users values($1),($2)", [admin, other]);
    await db.query("insert into public.admin_users(user_id) values($1)", [
      admin,
    ]);
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: admin, aal: "aal2" }),
    ]);
    await db.exec("set local role authenticated");
    await save(demoCatalog(), 0);
    await db.exec("commit");
  }, 30000);
  afterAll(async () => {
    await db.close();
  });
  it("anon consulta catálogo visible pero no tablas internas", async () => {
    await asRole(null, "", async () => {
      const data = await snapshot();
      expect(data.products).toHaveLength(4);
      expect(data.revision).toBe(0);
      expect(
        data.products.find((item) => item.slug === "pre-entreno-de-prueba")
          ?.variants[0].stock,
      ).toBe(0);
      await expect(
        db.query("select * from public.catalog_products"),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("rechaza escritura de anon, usuario ajeno y admin sin MFA", async () => {
    for (const [id, aal] of [
      [null, ""],
      [other, "aal2"],
      [admin, "aal1"],
    ] as const)
      await asRole(id, aal, async () => {
        await expect(save(demoCatalog())).rejects.toMatchObject({
          code: "42501",
        });
      });
  });
  it("los cambios de stock son auditados en la misma transacción", async () => {
    await asRole(admin, "aal2", async () => {
      const data = await snapshot();
      data.products[0].variants[0].stock = 3;
      await save(data);
      const rows = await db.query<{ quantity_delta: number }>(
        "select quantity_delta from public.inventory_movements where variant_id=$1 order by id desc limit 1",
        [data.products[0].variants[0].id],
      );
      expect(rows.rows[0].quantity_delta).toBe(-5);
      expect((await snapshot()).revision).toBe(2);
      expect(
        (
          await db.query(
            "select * from public.admin_audit_log where action='catalog_saved'",
          )
        ).rows,
      ).toHaveLength(2);
    });
  });
  it("la versión evita sobrescribir cambios de otra sesión", async () => {
    await asRole(admin, "aal2", async () => {
      await save(await snapshot());
      await expect(save(await snapshot(), 1)).rejects.toMatchObject({
        code: "40001",
      });
    });
  });
  it("un precio o stock inválido revierte el lote completo", async () => {
    const data = demoCatalog();
    data.products[0].variants[0].stock = 2;
    data.products[1].variants[0].stock = -1;
    await expect(asRole(admin, "aal2", () => save(data))).rejects.toMatchObject(
      { code: "23514" },
    );
    await asRole(admin, "aal2", async () => {
      const result = await snapshot();
      expect(result.revision).toBe(1);
      expect(
        result.products.find((item) => item.slug === "proteina-de-prueba")
          ?.variants[0].stock,
      ).toBe(8);
    });
  });
  it("los SKU duplicados bloquean todo el lote", async () => {
    const data = demoCatalog();
    data.products[1].variants[0].sku = data.products[0].variants[0].sku;
    await expect(asRole(admin, "aal2", () => save(data))).rejects.toThrow(
      /Duplicate/,
    );
  });
  it("guarda logos y umbral, y audita precios antes y después", async () => {
    await asRole(admin, "aal2", async () => {
      const data = await snapshot();
      data.lowStockThreshold = 3;
      data.brands[0].logo = `${data.brands[0].id}/00000000-0000-4000-8000-000000000091.webp`;
      const variant = data.products[0].variants[0];
      const before = variant.listPrice;
      variant.listPrice += 29;
      await save(data);
      const result = await snapshot();
      expect(result.lowStockThreshold).toBe(3);
      expect(result.brands[0].logo).toBe(data.brands[0].logo);
      const rows = await db.query<{
        previous_list_price: number;
        new_list_price: number;
      }>(
        "select previous_list_price,new_list_price from public.catalog_price_changes where variant_id=$1 order by id desc limit 1",
        [variant.id],
      );
      expect(Number(rows.rows[0].previous_list_price)).toBe(before);
      expect(Number(rows.rows[0].new_list_price)).toBe(before + 29);
      await expect(
        db.query("delete from public.catalog_price_changes"),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("una foto no se puede asociar a la variante de otro producto", async () => {
    const data = demoCatalog();
    const product = data.products[0];
    product.images = [
      {
        id: "00000000-0000-4000-8000-000000000090",
        path: `${product.id}/00000000-0000-4000-8000-000000000091.webp`,
        alt: "Prueba",
        position: 0,
        variantId: data.products[1].variants[0].id,
      },
    ];
    await expect(asRole(admin, "aal2", () => save(data))).rejects.toMatchObject(
      { code: "23503" },
    );
  });
  it("el snapshot público omite productos y variantes ocultas", async () => {
    await db.exec("begin");
    try {
      await db.query(
        "update public.catalog_products set active=false where slug='creatina-de-prueba'",
      );
      await db.query(
        "update public.catalog_variants set active=false where sku='DEMO-1-B'",
      );
      await db.exec("set local role anon");
      const data = await snapshot();
      expect(data.products).toHaveLength(3);
      expect(
        data.products.find((item) => item.slug === "proteina-de-prueba")
          ?.variants,
      ).toHaveLength(1);
    } finally {
      await db.exec("rollback");
    }
  });
});
