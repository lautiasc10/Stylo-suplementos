import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminSession() {
  const client = await createSupabaseServerClient();
  if (!client) return { state: "unconfigured" as const };
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { state: "anonymous" as const };
  const { data: admin, error: membershipError } = await client.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (membershipError || !admin) return { state: "forbidden" as const };
  // getClaims verifica la firma; no confiar en getSession ni en metadatos editables.
  const { data: verified, error: claimsError } = await client.auth.getClaims();
  if (claimsError || !verified || verified.claims.sub !== user.id) return { state: "anonymous" as const };
  return { state: verified.claims.aal === "aal2" ? "authorized" as const : "mfa" as const, client, user };
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (session.state === "mfa") redirect("/admin/mfa");
  if (session.state !== "authorized") redirect("/admin/login");
  return session;
}
