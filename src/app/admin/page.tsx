import { requireAdmin } from "@/modules/admin/access";
import { signOut } from "@/modules/admin/actions";
import Link from "next/link";

export default async function AdminPage() {
  await requireAdmin();
  return (
    <section className="admin-dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PANEL PRIVADO</p>
          <h1>Administración STYLO</h1>
        </div>
        <form action={signOut}>
          <button className="button button-outline">Cerrar sesión</button>
        </form>
      </div>
      <div className="empty-state">
        <h2>Tu catálogo, a tu manera.</h2>
        <p>
          Gestioná marcas, categorías, productos, variantes, imágenes y stock.
        </p>
        <Link className="button button-gold" href="/admin/catalogo">
          Gestionar catálogo
        </Link>
      </div>
    </section>
  );
}
