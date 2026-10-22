import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";

const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111";
const variant = demoCatalog().products[0].variants[0];
const hash = (letter: string) => letter.repeat(64);

async function asRole<T>(
  id: string | null,
  aal: string,
  run: () => Promise<T>,
  commit = false,
  service = false,
) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: id, aal, role: service ? "service_role" : id ? "authenticated" : "anon" }),
    ]);
    await db.exec(`set local role ${service ? "service_role" : id ? "authenticated" : "anon"}`);
    const result = await run();
    await db.exec(commit ? "commit" : "rollback");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

describe("avisos de reposición: confirmación, permisos y envío único", () => {
  beforeAll(async () => {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      grant usage on schema public,auth,storage to anon,authenticated,service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);
      alter table storage.objects enable row level security;`);
    for (const file of [
      "202610100001_foundations.sql",
      "202610100002_catalog.sql",
      "202610110001_commerce.sql",
      "202610110002_manual_cash_sales.sql",
      "202610200001_promotion_limits.sql",
      "202610210001_restock_alerts.sql",
    ])
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await db.query("insert into auth.users values($1)", [admin]);
    await db.query("insert into public.admin_users(user_id) values($1)", [admin]);
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: admin, aal: "aal2" }),
    ]);
    await db.exec("set local role authenticated");
    await db.query("select public.save_catalog($1::jsonb,0)", [
      JSON.stringify(demoCatalog()),
    ]);
    await db.exec("commit");
    await db.query("update public.catalog_variants set stock=0 where id=$1", [
      variant.id,
    ]);
  }, 30000);
  afterAll(async () => db.close());

  it("mantiene el correo privado y no admite suscripciones repetidas", async () => {
    await asRole(null, "", async () => {
      await expect(db.query("select * from public.restock_alerts")).rejects.toMatchObject({
        code: "42501",
      });
    });
    await asRole(null, "", async () => {
      await expect(
        db.query("select public.request_restock_alert($1,$2,$3)", [
          variant.id,
          "prueba@example.com",
          hash("a"),
        ]),
      ).rejects.toMatchObject({ code: "42501" });
    });
    await asRole(null, "", async () => {
      const input = [variant.id, "Prueba@Example.com", hash("a")];
      const first = await db.query<{ request_restock_alert: boolean }>(
        "select public.request_restock_alert($1,$2,$3)",
        input,
      );
      expect(first.rows[0].request_restock_alert).toBe(true);
      const again = await db.query<{ request_restock_alert: boolean }>(
        "select public.request_restock_alert($1,$2,$3)",
        input,
      );
      expect(again.rows[0].request_restock_alert).toBe(false);
      const bad = await db.query<{ request_restock_alert: boolean }>(
        "select public.request_restock_alert($1,$2,$3)",
        [variant.id, "inválido", hash("b")],
      );
      expect(bad.rows[0].request_restock_alert).toBe(false);
    }, true, true);
    await asRole(null, "", async () => {
      await expect(db.query("select public.claim_restock_alerts(10)")).rejects.toMatchObject({
        code: "42501",
      });
    });
    const stored = await db.query<{ email: string; status: string }>(
      "select email,status from public.restock_alerts",
    );
    expect(stored.rows).toEqual([{ email: "prueba@example.com", status: "pending" }]);
  });

  it("solo un correo confirmado entra en cola cuando vuelve el stock", async () => {
    await asRole(null, "", async () => {
      const confirmed = await db.query<{ confirm_restock_alert: boolean }>(
        "select public.confirm_restock_alert($1)",
        [hash("a")],
      );
      expect(confirmed.rows[0].confirm_restock_alert).toBe(true);
      const twice = await db.query<{ confirm_restock_alert: boolean }>(
        "select public.confirm_restock_alert($1)",
        [hash("a")],
      );
      expect(twice.rows[0].confirm_restock_alert).toBe(false);
    }, true, true);
    await db.query("update public.catalog_variants set stock=4 where id=$1", [variant.id]);
    await asRole(admin, "aal1", async () => {
      await expect(db.query("select public.claim_restock_alerts(10)")).rejects.toMatchObject({
        code: "42501",
      });
    });
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: admin, aal: "aal2" }),
    ]);
    await db.exec("set local role authenticated");
    const claimed = await db.query<{ alert_id: string; recipient: string }>(
      "select * from public.claim_restock_alerts(10)",
    );
    expect(claimed.rows).toHaveLength(1);
    expect(claimed.rows[0].recipient).toBe("prueba@example.com");
    await db.query("select public.complete_restock_alert($1,$2)", [
      claimed.rows[0].alert_id,
      "provider-test-id",
    ]);
    const repeat = await db.query("select * from public.claim_restock_alerts(10)");
    expect(repeat.rows).toHaveLength(0);
    await db.exec("commit");
    const status = await db.query<{ status: string; attempts: number }>(
      "select status,attempts from public.restock_alerts",
    );
    expect(status.rows).toEqual([{ status: "sent", attempts: 1 }]);
  });

  it("permite cancelar y volver a pedir aviso en un nuevo ciclo", async () => {
    await db.query("update public.catalog_variants set stock=0 where id=$1", [variant.id]);
    await asRole(null, "", async () => {
      const renewed = await db.query<{ request_restock_alert: boolean }>(
        "select public.request_restock_alert($1,$2,$3)",
        [variant.id, "prueba@example.com", hash("c")],
      );
      expect(renewed.rows[0].request_restock_alert).toBe(true);
      const cancelled = await db.query<{ cancel_restock_alert: boolean }>(
        "select public.cancel_restock_alert($1)",
        [hash("c")],
      );
      expect(cancelled.rows[0].cancel_restock_alert).toBe(true);
      const stale = await db.query<{ confirm_restock_alert: boolean }>(
        "select public.confirm_restock_alert($1)",
        [hash("c")],
      );
      expect(stale.rows[0].confirm_restock_alert).toBe(false);
    }, true, true);
  });

  it("permite al trabajador privado reintentar un envío fallido sin duplicarlo", async () => {
    await asRole(null, "", async () => {
      const request = await db.query<{ request_restock_alert: boolean }>(
        "select public.request_restock_alert($1,$2,$3)",
        [variant.id, "prueba@example.com", hash("d")],
      );
      expect(request.rows[0].request_restock_alert).toBe(true);
      const confirmation = await db.query<{ confirm_restock_alert: boolean }>(
        "select public.confirm_restock_alert($1)",
        [hash("d")],
      );
      expect(confirmation.rows[0].confirm_restock_alert).toBe(true);
    }, true, true);
    await db.query("update public.catalog_variants set stock=5 where id=$1", [variant.id]);
    await asRole(null, "", async () => {
      const claimed = await db.query<{ alert_id: string }>(
        "select * from public.claim_restock_alerts(10)",
      );
      expect(claimed.rows).toHaveLength(1);
      await db.query("select public.fail_restock_alert($1)", [claimed.rows[0].alert_id]);
    }, true, true);
    const queued = await db.query<{ status: string; attempts: number }>(
      "select status,attempts from public.restock_alerts",
    );
    expect(queued.rows).toEqual([{ status: "queued", attempts: 1 }]);
    await db.exec("update public.restock_alerts set next_attempt_at = now() - interval '1 minute'");
    await asRole(null, "", async () => {
      const claimed = await db.query<{ alert_id: string }>(
        "select * from public.claim_restock_alerts(10)",
      );
      expect(claimed.rows).toHaveLength(1);
      await db.query("select public.complete_restock_alert($1,$2)", [
        claimed.rows[0].alert_id,
        "resend-test-id",
      ]);
      const third = await db.query("select * from public.claim_restock_alerts(10)");
      expect(third.rows).toHaveLength(0);
    }, true, true);
  });

  it("libera una solicitud pendiente si falla el correo de confirmación", async () => {
    await db.query("update public.catalog_variants set stock=0 where id=$1", [variant.id]);
    await asRole(null, "", async () => {
      await db.query("select public.request_restock_alert($1,$2,$3)", [
        variant.id, "prueba@example.com", hash("e"),
      ]);
    }, true, true);
    await asRole(null, "", async () => {
      await expect(db.query("select public.abandon_restock_request($1)", [hash("e")]))
        .rejects.toMatchObject({ code: "42501" });
    });
    await asRole(null, "", async () => {
      await db.query("select public.abandon_restock_request($1)", [hash("e")]);
    }, true, true);
    const stored = await db.query("select id from public.restock_alerts");
    expect(stored.rows).toHaveLength(0);
  });
});
