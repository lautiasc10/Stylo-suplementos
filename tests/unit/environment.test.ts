import { describe, expect, it } from "vitest";
import { readEnvironment } from "../../src/lib/config/environment";

describe("aislamiento y secretos", () => {
  it("permite una web local sin habilitar Supabase", () => {
    expect(readEnvironment({}).supabase).toBeNull();
  });
  it("rechaza configuración parcial para evitar autenticación ambigua", () => {
    expect(() => readEnvironment({ SUPABASE_URL: "https://example.supabase.co" })).toThrow();
  });
  it("rechaza la clave privada moderna", () => {
    expect(() => readEnvironment({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_secret_example" })).toThrow();
  });
  it("rechaza service_role legacy aunque se coloque como clave pública", () => {
    const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
    expect(() => readEnvironment({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: `eyJheader.${payload}.signature` })).toThrow();
  });
  it("requiere HTTPS en producción y permite Supabase local solo en local", () => {
    expect(() => readEnvironment({ APP_ENV: "production" })).toThrow();
    expect(() => readEnvironment({ APP_ENV: "staging", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example" })).toThrow();
    expect(readEnvironment({ SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example" }).supabase).not.toBeNull();
  });
});
