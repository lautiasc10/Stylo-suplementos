import { requireAdmin } from "@/modules/admin/access";
import { signOut } from "@/modules/admin/actions";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { getCatalog } from "@/modules/catalog/server";

export default async function AdminPage() {
  await requireAdmin();
  const { catalog, error } = await getCatalog();
  const variants = catalog.products.flatMap((product) =>
    product.variants.filter((variant) => variant.active),
  );
  return (
    <section className="admin-dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN STYLO</p>
          <h1>Resumen de la tienda</h1>
        </div>
        <form action={signOut}>
          <button className="button button-outline">Cerrar sesión</button>
        </form>
      </div>
      <p className="page-intro">Productos, existencias y registros de venta.</p>
      {error && (
        <p className="ui-notice" role="alert">
          {error}
        </p>
      )}
      {!error && (
        <dl className="admin-overview">
          <div className="admin-stat">
            <dt>Productos publicados</dt>
            <dd>
              {catalog.products.filter((product) => product.active).length}
            </dd>
          </div>
          <div className="admin-stat">
            <dt>Presentaciones activas</dt>
            <dd>{variants.length}</dd>
          </div>
          <div className="admin-stat">
            <dt>Presentaciones con stock bajo</dt>
            <dd>
              {
                variants.filter(
                  (variant) =>
                    variant.stock <= (catalog.lowStockThreshold ?? 0),
                ).length
              }
            </dd>
          </div>
        </dl>
      )}
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
