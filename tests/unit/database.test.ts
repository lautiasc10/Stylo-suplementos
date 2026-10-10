import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const adminId = "11111111-1111-4111-8111-111111111111";
const outsiderId = "22222222-2222-4222-8222-222222222222";
const db = new PGlite();

async function asUser<T>(id: string, aal: string, operation: () => Promise<T>) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id, aal })]);
    await db.exec("set local role authenticated");
    return await operation();
  } finally { await db.exec("rollback"); }
}

describe("migración y permisos PostgreSQL", () => {
  beforeAll(async () => {
    // Helpers/esquemas mínimos de Supabase. No simula criptografía ni Auth remoto.
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create schema storage;
      create table auth.users (id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as
        $$ select (auth.jwt()->>'sub')::uuid $$;
      grant usage on schema public, auth, storage to anon, authenticated;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id bigint generated always as identity primary key, bucket_id text references storage.buckets(id), name text);
      alter table storage.objects enable row level security;
      grant select, insert, update, delete on storage.objects to authenticated;
      grant usage on sequence storage.objects_id_seq to authenticated;
    `);
    await db.exec(readFileSync("supabase/migrations/202610100001_foundations.sql", "utf8"));
    await db.query("insert into auth.users(id) values ($1), ($2)", [adminId, outsiderId]);
    await db.query("insert into public.admin_users(user_id) values ($1)", [adminId]);
    await db.query("insert into public.admin_audit_log(admin_id, action) values ($1, 'initial_setup')", [adminId]);
  }, 30000);
  afterAll(async () => { await db.close(); });

  it("impide crear un segundo administrador", async () => {
    await expect(db.query("insert into public.admin_users(user_id) values ($1)", [outsiderId])).rejects.toMatchObject({ code: "23505" });
  });
  it("anon no consulta pertenencia ni auditoría", async () => {
    for (const table of ["admin_users", "admin_audit_log"]) {
      await db.exec("begin; set local role anon");
      try { await expect(db.query(`select * from public.${table}`)).rejects.toMatchObject({ code: "42501" }); }
      finally { await db.exec("rollback"); }
    }
  });
  it("usuario ajeno incluso con MFA no se convierte en administrador", async () => {
    await asUser(outsiderId, "aal2", async () => {
      expect((await db.query("select * from public.admin_users")).rows).toHaveLength(0);
      expect((await db.query("select * from public.admin_audit_log")).rows).toHaveLength(0);
      await expect(db.query("select public.record_admin_action('change')")).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("admin sin segundo factor no lee auditoría ni sube imágenes", async () => {
    await asUser(adminId, "aal1", async () => {
      expect((await db.query("select * from public.admin_users")).rows).toHaveLength(1);
      expect((await db.query("select * from public.admin_audit_log")).rows).toHaveLength(0);
      await expect(db.query("insert into storage.objects(bucket_id, name) values ('product-media', 'test.webp')")).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("admin con MFA puede registrar auditoría y subir imágenes autorizadas", async () => {
    await asUser(adminId, "aal2", async () => {
      expect((await db.query("select * from public.admin_audit_log")).rows).toHaveLength(1);
      await db.query("select public.record_admin_action('test_action', 'test_target')");
      expect((await db.query("select * from public.admin_audit_log")).rows).toHaveLength(2);
      await db.query("insert into storage.objects(bucket_id, name) values ('product-media', 'test.webp')");
      await expect(db.query("insert into public.admin_users(user_id) values ($1)", [outsiderId])).rejects.toMatchObject({ code: "42501" });
    });
  });
});
