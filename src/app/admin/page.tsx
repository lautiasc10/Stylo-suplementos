import { requireAdmin } from "@/modules/admin/access";
import { signOut } from "@/modules/admin/actions";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

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
      <p className="page-intro">
        Elegí qué querés gestionar. Cada sección reúne sus herramientas y
        acciones.
      </p>
      <div className="admin-sections">
        <Link className="admin-section-card" href="/admin/catalogo">
          <Icon name="bag" />
          <h2>Catálogo e inventario</h2>
          <p>Productos, variantes, fotografías y existencias por SKU.</p>
          <span>
            Gestionar catálogo <Icon name="arrow" />
          </span>
        </Link>
        <Link className="admin-section-card" href="/admin/promociones">
          <Icon name="bolt" />
          <h2>Precios y promociones</h2>
          <p>Rebajas, ofertas por cantidad y combos con dos precios finales.</p>
          <span>
            Gestionar promociones <Icon name="arrow" />
          </span>
        </Link>
        <Link className="admin-section-card" href="/admin/pedidos">
          <Icon name="cart" />
          <h2>Ventas y retiros</h2>
          <p>
            Registrá ventas presenciales en efectivo y pedidos para retirar.
          </p>
          <span>
            Ver ventas y retiros <Icon name="arrow" />
          </span>
        </Link>
      </div>
    </section>
  );
}
