"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminSession } from "./access";

export type LoginState = { error: string };

export async function signIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) {
    return { error: "Revisá tu correo y contraseña." };
  }
  const client = await createSupabaseServerClient();
  if (!client) return { error: "El acceso todavía no está habilitado." };
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: "No pudimos iniciar sesión. Revisá tus datos o intentá más tarde." };
  const session = await getAdminSession();
  if (session.state !== "authorized" && session.state !== "mfa") {
    await client.auth.signOut();
    return { error: "No pudimos iniciar sesión. Revisá tus datos o intentá más tarde." };
  }
  redirect(session.state === "authorized" ? "/admin" : "/admin/mfa");
}

export async function signOut() {
  const client = await createSupabaseServerClient();
  await client?.auth.signOut();
  redirect("/admin/login");
}

export async function enrollAuthenticator() {
  const session = await getAdminSession();
  if (session.state !== "mfa") return { error: "Volvé a iniciar sesión." };
  const { data: factors, error: listError } = await session.client.auth.mfa.listFactors();
  if (listError || factors.totp.some(f => f.status === "verified")) return { error: "Ya existe un autenticador. Usá su código." };
  // Retirar solamente intentos de alta no verificados de esta misma sesión.
  for (const factor of factors.all.filter(f => f.factor_type === "totp" && f.status === "unverified")) {
    const { error } = await session.client.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { error: "No pudimos preparar el autenticador. Intentá más tarde." };
  }
  const { data, error } = await session.client.auth.mfa.enroll({ factorType: "totp", friendlyName: "STYLO administrador" });
  if (error) return { error: "No pudimos preparar el autenticador. Intentá más tarde." };
  return { factorId: data.id, qrCode: data.totp.qr_code };
}

export async function verifyAuthenticator(_previous: LoginState, form: FormData): Promise<LoginState> {
  const session = await getAdminSession();
  if (session.state !== "mfa") return { error: "Volvé a iniciar sesión." };
  const code = String(form.get("code") ?? "").trim();
  const factorId = String(form.get("factorId") ?? "");
  if (!/^\d{6}$/.test(code)) return { error: "Ingresá los seis dígitos del autenticador." };
  const { data: factors, error: factorsError } = await session.client.auth.mfa.listFactors();
  if (factorsError || !factors.all.some(f => f.id === factorId && f.factor_type === "totp")) {
    return { error: "Autenticador inválido. Volvé a iniciar sesión." };
  }
  const { error } = await session.client.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "El código no es válido o venció. Probá con el siguiente." };
  const verified = await getAdminSession();
  if (verified.state !== "authorized") return { error: "No pudimos verificar el acceso." };
  redirect("/admin");
}
