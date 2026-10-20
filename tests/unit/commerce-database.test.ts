import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { quoteCart, merchandiseTotal } from "../../src/modules/commerce/cart";
import type { Promotion } from "../../src/modules/commerce/promotions";
const db = new PGlite(),
  admin = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const variant = demoCatalog().products[0].variants[0];
const promotions = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Rebaja de prueba",
    kind: "sale",
    active: true,
    components: [{ variantId: variant.id, quantity: 1 }],
    listPrice: 4000000,
    cashPrice: 3900000,
    startsAt: null,
    endsAt: null,
  },
];
async function role<T>(id: string | null, aal: string, fn: () => Promise<T>) {
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
const save = (payload: unknown = promotions, revision = 1) =>
  db.query("select public.save_commerce_promotions($1::jsonb,$2)", [
    JSON.stringify(payload),
    revision,
  ]);
const request = "44444444-4444-4444-8444-444444444444";
const order = (quantity = 2) =>
  db.query<{
    create_manual_pickup_order: { id: string; snapshot: { total: number } };
  }>("select public.create_manual_pickup_order($1,$2::jsonb,$3::jsonb)", [
    request,
    JSON.stringify([{ variantId: variant.id, quantity }]),
    JSON.stringify({ name: "Cliente ficticio", phone: "" }),
  ]);
describe("Fase 3: precios de servidor, permisos e idempotencia", () => {
  beforeAll(async () => {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      grant usage on schema public,auth,storage to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);alter table storage.objects enable row level security;`);
    for (const file of [
      "202610100001_foundations.sql",
      "202610100002_catalog.sql",
      "202610110001_commerce.sql",
      "202610110002_manual_cash_sales.sql",
      "202610200001_promotion_limits.sql",
    ])
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await db.query("insert into auth.users values($1),($2)", [admin, other]);
    await db.query("insert into public.admin_users(user_id) values($1)", [
      admin,
    ]);
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: admin, aal: "aal2" }),
    ]);
    await db.exec("set local role authenticated");
    await db.query("select public.save_catalog($1::jsonb,0)", [
      JSON.stringify(demoCatalog()),
    ]);
    await save(promotions, 0);
    await db.exec("commit");
  }, 30000);
  afterAll(async () => {
    await db.close();
  });
  it("anon lee promociones activas pero no pedidos, contactos ni configuración privada", async () => {
    await role(null, "", async () => {
      const result = await db.query<{
        commerce_promotions: { promotions: unknown[]; revision: number };
      }>("select public.commerce_promotions()");
      expect(result.rows[0].commerce_promotions.promotions).toHaveLength(1);
      expect(result.rows[0].commerce_promotions.revision).toBe(0);
      await expect(
        db.query("select * from public.commerce_orders"),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("solo el administrador con MFA puede crear retiros y guardar promociones", async () => {
    for (const [id, aal] of [
      [null, ""],
      [other, "aal2"],
      [admin, "aal1"],
    ] as const) {
      await role(id, aal, async () => {
        await expect(save()).rejects.toMatchObject({ code: "42501" });
      });
      await role(id, aal, async () => {
        await expect(order()).rejects.toMatchObject({ code: "42501" });
      });
    }
  });
  it("precios de servidor, snapshot inmutable y repetición idempotente", async () => {
    await role(admin, "aal2", async () => {
      const first = (await order()).rows[0].create_manual_pickup_order,
        again = (await order()).rows[0].create_manual_pickup_order;
      expect(first.id).toBe(again.id);
      expect(first.snapshot.total).toBe(7800000);
      expect(
        (
          await db.query<{ count: number }>(
            "select count(*)::int as count from public.commerce_orders",
          )
        ).rows[0].count,
      ).toBe(1);
      const rows = await db.query<{
        payment_status: string;
        fulfillment_status: string;
      }>(
        "select payment_status,fulfillment_status from public.commerce_orders",
      );
      expect(rows.rows[0]).toEqual({
        payment_status: "pending",
        fulfillment_status: "pending_pickup",
      });
      const stock = await db.query<{ stock: number }>(
        "select stock from public.catalog_variants where id=$1",
        [variant.id],
      );
      expect(stock.rows[0].stock).toBe(8);
      const audit = await db.query(
        "select * from public.admin_audit_log where action='manual_pickup_order_created'",
      );
      expect(audit.rows).toHaveLength(1);
    });
    await role(admin, "aal2", async () => {
      await order();
      await expect(order(3)).rejects.toMatchObject({ code: "40001" });
    });
    await role(admin, "aal2", async () => {
      await order();
      await expect(
        db.query("update public.commerce_orders set snapshot='{}'::jsonb"),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("rechaza promociones corruptas, revisiones viejas y pedidos por encima del stock", async () => {
    await role(admin, "aal2", async () => {
      await expect(save(promotions, 0)).rejects.toMatchObject({
        code: "40001",
      });
    });
    await role(admin, "aal2", async () => {
      await expect(
        save([{ ...promotions[0], cashPrice: 0 }]),
      ).rejects.toThrow();
    });
    await role(admin, "aal2", async () => {
      await expect(order(9)).rejects.toThrow();
    });
  });
  it("PostgreSQL coincide con el motor de carrito al comparar combos y cantidad", async () => {
    const catalog = demoCatalog(),
      creatine = catalog.products[1].variants[0];
    const items = [
      { variantId: variant.id, quantity: 3 },
      { variantId: creatine.id, quantity: 2 },
    ];
    const offers: Promotion[] = [
      {
        ...promotions[0],
        kind: "quantity",
        components: [{ variantId: variant.id, quantity: 3 }],
        cashPrice: 3800000,
      },
      {
        ...promotions[0],
        id: "55555555-5555-4555-8555-555555555555",
        name: "Combo",
        kind: "bundle",
        components: [
          { variantId: variant.id, quantity: 1 },
          { variantId: creatine.id, quantity: 1 },
        ],
        listPrice: 6000000,
        cashPrice: 5000000,
      },
    ];
    await role(admin, "aal2", async () => {
      await save(offers);
      const result = await db.query<{
        create_manual_pickup_order: {
          snapshot: { total: number; promotion: string };
        };
      }>("select public.create_manual_pickup_order($1,$2::jsonb,$3::jsonb)", [
        request,
        JSON.stringify(items),
        JSON.stringify({ name: "Cliente de prueba", phone: "" }),
      ]);
      expect(result.rows[0].create_manual_pickup_order.snapshot.total).toBe(
        merchandiseTotal(quoteCart(catalog, items, offers), "efectivo"),
      );
      expect(result.rows[0].create_manual_pickup_order.snapshot.promotion).toBe(
        "Combo",
      );
    });
  });
  it("la venta en efectivo descuenta stock y registra cobro una sola vez, con revisión y auditoría", async () => {
    const sale = (received = true, quantity = 2) =>
      db.query<{
        create_manual_cash_sale: { id: string; snapshot: { total: number } };
      }>("select public.create_manual_cash_sale($1,$2::jsonb,$3::jsonb,$4)", [
        request,
        JSON.stringify([{ variantId: variant.id, quantity }]),
        JSON.stringify({ name: "Cliente ficticio", phone: "" }),
        received,
      ]);
    for (const [id, aal] of [
      [null, ""],
      [other, "aal2"],
      [admin, "aal1"],
    ] as const) {
      await role(id, aal, async () => {
        await expect(sale()).rejects.toMatchObject({ code: "42501" });
      });
    }
    await role(admin, "aal2", async () => {
      await expect(sale(false)).rejects.toThrow();
    });
    await role(admin, "aal2", async () => {
      await expect(sale(true, 9)).rejects.toThrow();
    });
    await role(admin, "aal2", async () => {
      const first = (await sale()).rows[0].create_manual_cash_sale;
      const again = (await sale()).rows[0].create_manual_cash_sale;
      expect(again.id).toBe(first.id);
      expect(first.snapshot.total).toBe(7800000);
      expect(
        (
          await db.query(
            "select payment_status,fulfillment_status from public.commerce_orders",
          )
        ).rows[0],
      ).toEqual({ payment_status: "paid", fulfillment_status: "delivered" });
      expect(
        (
          await db.query<{ stock: number }>(
            "select stock from public.catalog_variants where id=$1",
            [variant.id],
          )
        ).rows[0].stock,
      ).toBe(6);
      expect(
        (
          await db.query<{ revision: number }>(
            "select revision from public.catalog_state where id",
          )
        ).rows[0].revision,
      ).toBe(2);
      expect(
        (
          await db.query(
            "select quantity_delta,previous_quantity,new_quantity from public.inventory_movements where reason='manual_cash_sale'",
          )
        ).rows,
      ).toEqual([
        { quantity_delta: -2, previous_quantity: 8, new_quantity: 6 },
      ]);
      expect(
        (
          await db.query(
            "select id from public.admin_audit_log where action='manual_cash_sale_created'",
          )
        ).rows,
      ).toHaveLength(1);
    });
    await role(admin, "aal2", async () => {
      await sale();
      await expect(order()).rejects.toMatchObject({ code: "40001" });
    });
    await role(admin, "aal2", async () => {
      await sale();
      await expect(saveCatalogStale()).rejects.toMatchObject({ code: "40001" });
    });
  });
  it("consume el cupo solo al cobrar y vuelve al precio habitual al agotarlo", async () => {
    await role(admin, "aal2", async () => {
      await save([{ ...promotions[0], maxUses: 2, used: 999 }]);
      const sale = (id: string) => db.query<{
        create_manual_cash_sale: {
          id: string;
          snapshot: { total: number; promotion: string | null; promotionUses: number };
        };
      }>("select public.create_manual_cash_sale($1,$2::jsonb,$3::jsonb,true)", [
        id,
        JSON.stringify([{ variantId: variant.id, quantity: 1 }]),
        JSON.stringify({ name: "Cliente de prueba", phone: "" }),
      ]);
      const ids = [
        "66666666-6666-4666-8666-666666666661",
        "66666666-6666-4666-8666-666666666662",
        "66666666-6666-4666-8666-666666666663",
      ];
      await db.query("select public.create_manual_pickup_order($1,$2::jsonb,$3::jsonb)", [
        "66666666-6666-4666-8666-666666666660",
        JSON.stringify([{ variantId: variant.id, quantity: 1 }]),
        JSON.stringify({ name: "Cliente pendiente", phone: "" }),
      ]);
      const beforePayment = await db.query<{
        commerce_promotions: { promotions: { used: number }[] };
      }>("select public.commerce_promotions()");
      expect(beforePayment.rows[0].commerce_promotions.promotions[0].used).toBe(0);
      const first = (await sale(ids[0])).rows[0].create_manual_cash_sale;
      const again = (await sale(ids[0])).rows[0].create_manual_cash_sale;
      expect(again.id).toBe(first.id);
      const second = (await sale(ids[1])).rows[0].create_manual_cash_sale;
      expect(first.snapshot.promotionUses).toBe(1);
      expect(second.snapshot.promotionUses).toBe(1);
      const third = (await sale(ids[2])).rows[0].create_manual_cash_sale;
      expect(third.snapshot.promotion).toBeNull();
      expect(third.snapshot.total).toBe(variant.cashPrice);
      const result = await db.query<{
        commerce_promotions: { promotions: { used: number; maxUses: number }[] };
      }>("select public.commerce_promotions()");
      expect(result.rows[0].commerce_promotions.promotions[0]).toMatchObject({
        used: 2,
        maxUses: 2,
      });
      await expect(save([{ ...promotions[0], maxUses: 1 }], 2)).rejects.toThrow();
    });
  });
});
function saveCatalogStale() {
  return db.query("select public.save_catalog($1::jsonb,1)", [
    JSON.stringify(demoCatalog()),
  ]);
}
