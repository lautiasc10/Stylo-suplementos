import { redirect } from "next/navigation";
import { getAdminSession } from "@/modules/admin/access";
import { MfaForm } from "@/components/admin/mfa-form";
import { signOut } from "@/modules/admin/actions";

export default async function MfaPage() {
  const session = await getAdminSession();
  if (session.state === "authorized") redirect("/admin");
  if (session.state !== "mfa") redirect("/admin/login");
  const { data: factors, error } = await session.client.auth.mfa.listFactors();
  const existing = factors?.totp.find(factor => factor.status === "verified");
  return <section className="auth-card"><p className="eyebrow">VERIFICACIÓN EN DOS PASOS</p><h1>Confirmá tu acceso.</h1><p>{existing ? "Ingresá el código de tu aplicación de autenticación." : "Configurá un autenticador para proteger la administración."}</p>{error ? <p role="alert">No pudimos consultar tus autenticadores. Volvé a iniciar sesión.</p> : <MfaForm existingFactor={existing?.id} />}<form action={signOut}><button className="text-link">Cerrar sesión</button></form></section>;
}
