import { redirect } from "next/navigation";
import { getAdminSession } from "@/modules/admin/access";
import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session.state === "authorized") redirect("/admin");
  if (session.state === "mfa") redirect("/admin/mfa");
  const configured = session.state !== "unconfigured";
  return <section className="auth-card"><p className="eyebrow">ACCESO PRIVADO</p><h1>Bienvenido a STYLO.</h1><p>Ingresá para administrar la tienda.</p>{!configured && <p className="configuration-notice" role="status">El acceso administrativo todavía no está habilitado.</p>}<LoginForm configured={configured} /></section>;
}
