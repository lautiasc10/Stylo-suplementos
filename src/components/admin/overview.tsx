"use client";
import { useState } from "react";
import Link from "next/link";
import { formatPrice, variantLabel, type Catalog } from "@/modules/catalog/model";
import { monthLabel, type SalesSummary } from "@/modules/admin/sales-history";
import { navigateWorkspace, useWorkspaceNavigation } from "./workspace-navigation";

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { ready } = useWorkspaceNavigation();
  return <Link href={href} prefetch={ready ? false : undefined} onNavigate={(event) => {
    if (ready) { event.preventDefault(); navigateWorkspace(href); }
  }}>{children}</Link>;
}

export function AdminOverview({ catalog, monthlySales = null, preview = false }: {
  catalog: Catalog | null; monthlySales?: SalesSummary | null; preview?: boolean;
}) {
  const [months, setMonths] = useState<6 | 12>(6);
  const catalogHref = preview ? "/vista-previa/gestion" : "/admin/catalogo";
  const threshold = catalog?.lowStockThreshold ?? 5;
  const replenishments = (catalog?.products ?? []).filter((product) => product.active).flatMap((product) =>
    product.variants.filter((variant) => variant.active && variant.stock <= threshold).map((variant) => ({ product, variant,
      brand: catalog?.brands.find((brand) => brand.id === product.brandId)?.name ?? "",
    })),
  ).sort((a, b) => a.variant.stock - b.variant.stock || a.product.name.localeCompare(b.product.name, "es"));
  const soldOut = replenishments.filter(({ variant }) => variant.stock === 0).length;
  const hidden = (catalog?.products ?? []).filter((product) => !product.active).length;
  const current = monthlySales?.history.find((row) => row.month === monthlySales.month);
  const month = monthlySales ? monthLabel(monthlySales.month) : new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const series = monthlySales?.history.slice(-months) ?? [];
  const maxRevenue = Math.max(1, ...series.map((row) => row.revenue));
  return <section className="admin-premium-overview" aria-labelledby="admin-overview-title">
    <div className="admin-premium-heading"><div><p className="eyebrow">PANEL STYLO · {month.toLocaleUpperCase("es-AR")}</p><h1 id="admin-overview-title">Resumen de la tienda</h1><p>Ventas cobradas del mes y existencias actuales.</p></div></div>
    <dl className="admin-overview admin-month-stats" aria-label="Indicadores del mes">
      <div className="admin-stat"><dt>Facturación mensual</dt><dd>{current ? formatPrice(current.revenue, 0) : "—"}</dd><small>Cobrado menos devoluciones registradas</small></div>
      <div className="admin-stat"><dt>Ventas del mes</dt><dd>{current?.sales ?? "—"}</dd><small>Operaciones cobradas en {month}</small></div>
      <div className="admin-stat"><dt>Ganancias</dt><dd>{current && current.missing_costs === 0 ? formatPrice(current.profit ?? 0, 0) : "—"}</dd><small>{current?.missing_costs ? `${current.missing_costs} venta${current.missing_costs === 1 ? "" : "s"} sin costo comprobable` : current ? "Cobrado menos costos y gastos registrados" : "Faltan datos para calcularla"}</small></div>
      <div className="admin-stat"><dt>Ticket promedio</dt><dd>{current ? formatPrice(current.sales ? Math.round(current.revenue / current.sales) : 0, 0) : "—"}</dd><small>Facturación / ventas cobradas</small></div>
      <div className="admin-stat"><dt>Pendientes de retiro</dt><dd>{monthlySales?.pendingPickups ?? "—"}</dd><small>Aún no cuentan como ventas</small></div>
    </dl>
    <section className="admin-sales-chart" aria-labelledby="sales-chart-title">
      <div className="admin-premium-panel-heading"><div><h2 id="sales-chart-title">Facturación histórica</h2><p>Ventas cobradas por mes · Argentina</p></div><div className="admin-product-filter-chips" role="group" aria-label="Meses del gráfico"><button type="button" aria-pressed={months === 6} onClick={() => setMonths(6)}>6 meses</button><button type="button" aria-pressed={months === 12} onClick={() => setMonths(12)}>12 meses</button></div></div>
      {monthlySales ? <div className="admin-sales-chart-scroll"><div className="admin-sales-bars" role="list" aria-label="Facturación por mes">{series.map((row, index) => {
        const previous = index > 0 ? series[index - 1] : monthlySales.history.at(-months - 1);
        const change = previous && previous.revenue > 0 ? ((row.revenue - previous.revenue) / previous.revenue) * 100 : null;
        return <div className="admin-sales-bar" role="listitem" key={row.month} title={`${monthLabel(row.month)}: ${formatPrice(row.revenue, 0)}`}>
          <strong>{formatPrice(row.revenue, 0)}</strong><div className="admin-sales-bar-track"><span style={{ height: `${Math.max(row.revenue ? 4 : 0, row.revenue / maxRevenue * 100)}%` }} /></div><span>{monthLabel(row.month)}</span><small>{change === null ? "Sin comparación" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}</small>
        </div>;
      })}</div></div> : <p role="status">No pudimos cargar las estadísticas históricas.</p>}
    </section>
    <section className="admin-premium-restock" aria-labelledby="admin-restock-title">
      <div className="admin-premium-panel-heading"><div><h2 id="admin-restock-title">Para reponer</h2><p>{catalog ? `${replenishments.length} variantes con ${threshold} unidades o menos · ${soldOut} agotadas` : "No pudimos consultar el catálogo"}</p></div><AdminLink href={catalogHref}>Ver catálogo</AdminLink></div>
      {catalog && !replenishments.length && <p className="admin-premium-empty">No hay presentaciones para reponer.</p>}
      <ul>{replenishments.slice(0, 12).map(({ product, variant, brand }) => <li key={variant.id}><AdminLink href={`${catalogHref}?seccion=products&producto=${product.id}&variante=${variant.id}`}><strong>{product.name}</strong><small>{brand} · {variantLabel(variant)} · {variant.sku}</small></AdminLink><span className={variant.stock === 0 ? "is-empty" : ""}>{variant.stock === 0 ? "Agotada" : `${variant.stock} u.`}</span></li>)}</ul>
      {hidden > 0 && <p className="admin-premium-hidden">{hidden} producto{hidden === 1 ? "" : "s"} oculto{hidden === 1 ? "" : "s"} en el catálogo.</p>}
    </section>
  </section>;
}
