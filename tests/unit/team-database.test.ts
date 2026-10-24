import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";

const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const application = {
  kind: "teacher",
  name: "Persona de prueba",
  email: "persona@example.com",
  instagram: "@prueba",
  discipline: "Atletismo",
  message: "Consulta ficticia",
  consent: true,
};
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
const submit = (payload: unknown = application) =>
  db.query<{ id: string }>(
    "select public.submit_team_application($1::jsonb) as id",
    [JSON.stringify(payload)],
  );
describe("Team privado y ranking público mensual", () => {
  beforeAll(async () => {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      grant usage on schema public,auth,storage to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text); alter table storage.objects enable row level security;`);
    for (const file of [
      "202610100001_foundations.sql",
      "202610100002_catalog.sql",
      "202610110001_commerce.sql",
      "202610110002_manual_cash_sales.sql",
      "202610240001_team_and_home_content.sql",
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
    await db.exec("commit");
    await submit();
  }, 30000);
  afterAll(async () => {
    await db.close();
  });

  it("anon no lee datos personales ni escribe directo en la tabla", async () => {
    await expect(
      role(null, "", () => db.query("select * from public.team_applications")),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      role(null, "", () =>
        db.query(
          "insert into public.team_applications(kind,name,email,discipline,consent_version) values('athlete','No permitido','otro@example.com','Gym','team-contact-v1')",
        ),
      ),
    ).rejects.toThrow(/permission denied/i);
    const data = await role(other, "aal2", () =>
      db.query("select * from public.team_applications"),
    );
    expect(data.rows).toEqual([]);
    expect(
      (
        await role(admin, "aal1", () =>
          db.query("select * from public.team_applications"),
        )
      ).rows,
    ).toEqual([]);
  });
  it("el visitante registra una consulta por RPC y repetirla no la duplica", async () => {
    await role(null, "", async () => {
      const first = await submit({
        ...application,
        email: "NUEVA@example.com",
      });
      const second = await submit({
        ...application,
        email: "nueva@example.com",
      });
      expect(second.rows[0].id).toBe(first.rows[0].id);
    });
  });
  it("la base valida consentimiento, campos y límites aunque se evite el formulario", async () => {
    for (const payload of [
      { ...application, consent: false },
      { ...application, consent: "true" },
      { ...application, kind: "admin" },
      { ...application, email: "no-valido" },
      { ...application, message: "x".repeat(2001) },
    ])
      await expect(role(null, "", () => submit(payload))).rejects.toThrow(
        /Invalid application/,
      );
    await expect(
      role(null, "", () =>
        submit({ ...application, message: "Otro texto demasiado pronto" }),
      ),
    ).rejects.toThrow(/Please wait/);
  });
  it("solo el admin con MFA gestiona y la revisión impide sobrescribir cambios", async () => {
    const row = (
      await db.query<{ id: string; updated_at: string }>(
        "select id,updated_at from public.team_applications limit 1",
      )
    ).rows[0];
    for (const [id, aal] of [
      [other, "aal2"],
      [admin, "aal1"],
    ])
      await expect(
        role(id, aal, () =>
          db.query(
            "select public.review_team_application($1,'reviewing','nota',$2)",
            [row.id, row.updated_at],
          ),
        ),
      ).rejects.toThrow(/Access denied/);
    await role(admin, "aal2", async () => {
      await db.query(
        "select public.review_team_application($1,'contacted','Seguimiento de prueba',$2)",
        [row.id, row.updated_at],
      );
      const updated = (
        await db.query<{ status: string; notes: string }>(
          "select status,notes from public.team_applications where id=$1",
          [row.id],
        )
      ).rows[0];
      expect(updated).toEqual({
        status: "contacted",
        notes: "Seguimiento de prueba",
      });
      expect(
        (
          await db.query(
            "select * from public.admin_audit_log where action='team_application_reviewed' and target_id=$1",
            [row.id],
          )
        ).rows,
      ).toHaveLength(1);
      await expect(
        db.query(
          "select public.review_team_application($1,'closed','otra nota',$2)",
          [row.id, row.updated_at],
        ),
      ).rejects.toThrow(/Reload application/);
    });
  });
  it("el límite global también se aplica al llamar la RPC directamente", async () => {
    await db.exec("begin");
    try {
      await db.exec(`insert into public.team_applications(kind,name,email,discipline,consent_version)
        select 'athlete','Prueba de límite','limite-'||i||'@example.com','Gym','team-contact-v1' from generate_series(1,50) i`);
      await db.exec("set local role anon");
      await expect(submit({ ...application, email: "limite-nuevo@example.com" })).rejects.toThrow(/Please wait/);
    } finally { await db.exec("rollback"); }
  });
  it("el ranking agrupa SKU por producto, excluye impagos y meses anteriores y no filtra datos privados", async () => {
    await db.exec("begin");
    try {
      const products = demoCatalog().products.slice(0, 3);
      const add = async (
        index: number,
        quantity: number,
        paid: boolean,
        previousMonth = false,
        secondVariant = false,
      ) => {
        const variant = products[index].variants[secondVariant ? 1 : 0];
        await db.query(
          `insert into public.commerce_orders(id,request_id,source,payment_status,fulfillment_status,customer,request_payload,snapshot,admin_id,created_at)
          values(gen_random_uuid(),gen_random_uuid(),'manual',$1,$2,'{"name":"Privado","phone":"no-publicar"}','{}',$3::jsonb,$4,
          case when $5 then (date_trunc('month',now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires')-interval '1 second' else now() end)`,
          [
            paid ? "paid" : "pending",
            paid ? "delivered" : "pending_pickup",
            JSON.stringify({
              total: 1234,
              lines: [{ variantId: variant.id, quantity }],
            }),
            admin,
            previousMonth,
          ],
        );
      };
      await add(0, 5, true);
      await add(0, 6, true, false, true);
      await add(1, 10, true);
      await add(2, 9, true);
      await add(2, 100, false);
      await add(2, 100, true, true);
      await db.exec("set local role anon");
      const data = (
        await db.query<{
          data: {
            teamApplications: boolean;
            ranking: { productId: string; variantId: string }[];
          };
        }>("select public.storefront_content_snapshot() as data")
      ).rows[0].data;
      expect(data.teamApplications).toBe(true);
      expect(data.ranking.map((row) => row.productId)).toEqual(
        products.map((p) => p.id),
      );
      expect(data.ranking[0].variantId).toBe(products[0].variants[1].id);
      expect(Object.keys(data.ranking[0]).sort()).toEqual([
        "productId",
        "variantId",
      ]);
      expect(JSON.stringify(data)).not.toMatch(
        /Privado|no-publicar|email|1234/,
      );
    } finally {
      await db.exec("rollback");
    }
  });
});
