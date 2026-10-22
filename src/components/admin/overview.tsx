"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatPrice, type Catalog } from "@/modules/catalog/model";
import { navigateWorkspace, useWorkspaceNavigation } from "./workspace-navigation";


function AdminLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const { ready } = useWorkspaceNavigation();
  return <Link href={href} className={className} prefetch={ready ? false : undefined} onNavigate={(event) => {
    if (ready) { event.preventDefault(); navigateWorkspace(href); }
  }}>{children}</Link>;
}

export function AdminOverview({ catalog, monthlySales = null, preview = false }: {
  catalog: Catalog | null;
  monthlySales?: { amount: number; count: number } | null;
  preview?: boolean;
}) {
  const routes = preview ? { catalog: "/vista-previa/gestion", promotions: "/vista-previa/promociones" } : { catalog: "/admin/catalogo", promotions: "/admin/promociones" };
  const threshold = catalog?.lowStockThreshold ?? 5;
  const replenishments = (catalog?.products ?? []).filter((product) => product.active).flatMap((product) =>
    product.variants.filter((variant) => variant.active && variant.stock <= threshold).map((variant) => ({
      product, variant,
      brand: catalog?.brands.find((brand) => brand.id === product.brandId)?.name ?? "",
    })),
  ).sort((a, b) => a.variant.stock - b.variant.stock || a.product.name.localeCompare(b.product.name, "es"));
  const soldOut = replenishments.filter(({ variant }) => variant.stock === 0).length;
  const hidden = (catalog?.products ?? []).filter((product) => !product.active).length;
  const month = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

  return <section className="admin-premium-overview" aria-labelledby="admin-overview-title">
    <div className="admin-premium-heading">
      <div><p className="eyebrow">PANEL STYLO · {month.toLocaleUpperCase("es-AR")}</p><h1 id="admin-overview-title">Resumen de la tienda</h1><p>Un vistazo rápido a las ventas y lo que necesita tu atención.</p></div>
      <AdminLink href={`${routes.catalog}?nuevo=1`} className="admin-premium-primary"><Icon name="plus" /> Cargar producto</AdminLink>
    </div>
    <dl className="admin-overview" aria-label="Indicadores del mes">
      <div className="admin-stat"><dt>Ventas del mes</dt><dd>{monthlySales ? formatPrice(monthlySales.amount, 0) : "—"}</dd><small>{monthlySales ? `Ingresos cobrados en ${month}` : "No pudimos consultar las ventas"}</small></div>
      <div className="admin-stat"><dt>Cantidad de ventas</dt><dd>{monthlySales?.count ?? "—"}</dd><small>{monthlySales ? "Pedidos cobrados este mes" : "No pudimos consultar las ventas"}</small></div>
      <div className="admin-stat admin-stat-alert"><dt>Reponer</dt><dd>{catalog ? replenishments.length : "—"}</dd><small>{catalog ? `${soldOut} sin stock · ${replenishments.length - soldOut} con poco` : "No pudimos consultar el catálogo"}</small></div>
    </dl>
    <div className="admin-premium-content">
      <section className="admin-premium-restock" aria-labelledby="admin-restock-title">
        <div className="admin-premium-panel-heading"><div><h2 id="admin-restock-title">Para reponer</h2><p>Presentaciones con {threshold} unidades o menos.</p></div><AdminLink href={routes.catalog}>Ver todos</AdminLink></div>
        {catalog && !replenishments.length && <p className="admin-premium-empty">No hay presentaciones para reponer.</p>}
        {!catalog && <p className="admin-premium-empty">No pudimos consultar el catálogo.</p>}
        <ul>{replenishments.slice(0, 6).map(({ product, variant, brand }) => <li key={variant.id}><div><strong>{product.name}</strong><small>{brand}{variant.flavor ? ` · ${variant.flavor}` : ""}{variant.size ? ` · ${variant.size}` : ""}</small></div><span className={variant.stock === 0 ? "is-empty" : ""}>{variant.stock === 0 ? "Sin stock" : `Quedan ${variant.stock}`}</span></li>)}</ul>
      </section>
      <aside className="admin-premium-quick" aria-labelledby="admin-quick-title">
        <h2 id="admin-quick-title">Accesos rápidos</h2>
        <AdminLink href={routes.catalog} className="admin-premium-shortcut"><span><strong>Ver catálogo</strong><small>Buscar, editar precios y stock.</small></span><Icon name="arrow" /></AdminLink>
        <AdminLink href={`${routes.catalog}?nuevo=1`} className="admin-premium-shortcut"><span><strong>Cargar un producto nuevo</strong><small>Datos, precios y fotos.</small></span><Icon name="arrow" /></AdminLink>
        <AdminLink href={routes.promotions} className="admin-premium-shortcut"><span><strong>Promociones</strong><small>Ofertas vigentes y próximas.</small></span><Icon name="arrow" /></AdminLink>
        {hidden > 0 && <p className="admin-premium-hidden">Tenés {hidden} producto{hidden === 1 ? "" : "s"} oculto{hidden === 1 ? "" : "s"}. Los clientes no los ven en la tienda.</p>}
      </aside>
    </div>
  </section>;
}
