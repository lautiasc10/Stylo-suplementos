import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getEnvironment } from "@/lib/config/server";

/** Private client for the three public-form RPCs; never pass it to a component. */
export function restockDb() {
  const config = getEnvironment().supabase;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;
  return createClient(config.url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
