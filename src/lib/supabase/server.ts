import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnvironment } from "@/lib/config/server";

export async function createSupabaseServerClient() {
  const config = getEnvironment().supabase;
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        // Server Components no escriben cookies; proxy.ts renueva su sesión.
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Next.js limita la escritura durante renderizado. */ }
      },
    },
  });
}
