import { requireAdmin } from "@/modules/admin/access";
import { signOut } from "@/modules/admin/actions";

export default async function AdminPage() {
  await requireAdmin();
  return <section className="admin-dashboard"><div className="section-heading"><div><p className="eyebrow">PANEL PRIVADO</p><h1>Administración STYLO</h1></div><form action={signOut}><button className="button button-outline">Cerrar sesión</button></form></div><div className="empty-state"><h2>El inicio de tu tienda.</h2><p>La gestión del catálogo se incorporará en la próxima fase.</p></div></section>;
}
