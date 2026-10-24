"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/modules/catalog/model";
import type { OrderRecord } from "@/modules/commerce/orders";
import { collectManualPickup, readSalesPage } from "@/modules/admin/sales-actions";
import { salesPeriodBounds, type SalesPeriod, type SalesQuery, type SalesStatus } from "@/modules/admin/sales-history";
import { orderDate } from "@/modules/admin/order-date";
import { buenosAiresMonthBounds } from "@/modules/admin/monthly-sales";
import { AdminTable } from "@/components/admin/data-table";
import { AdminDrawer } from "@/components/admin/drawer";

const periods: [SalesPeriod, string][] = [["current", "Mes actual"], ["previous", "Mes anterior"], ["three", "Últimos 3 meses"], ["year", "Año actual"], ["custom", "Rango personalizado"]];

export function OrderHistory({ preview, previewRows, refreshKey, onPreviewCollect, onChanged }: {
  preview: boolean; previewRows: OrderRecord[]; refreshKey: number;
  onPreviewCollect: (id: string) => { row?: OrderRecord; error?: string };
  onChanged: () => void;
}) {
  const [period, setPeriod] = useState<SalesPeriod>("current");
  const [status, setStatus] = useState<SalesStatus>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [remote, setRemote] = useState<{ rows: OrderRecord[]; total: number; error?: string }>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(!preview);
  const [selected, setSelected] = useState<OrderRecord | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [monthKey, setMonthKey] = useState(() => buenosAiresMonthBounds(new Date()).start.slice(0, 7));
  const trigger = useRef<string | null>(null);
  useEffect(() => { const timer = setTimeout(() => setDebounced(search), 250); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { const timer = window.setInterval(() => setMonthKey(buenosAiresMonthBounds(new Date()).start.slice(0, 7)), 60_000); return () => window.clearInterval(timer); }, []);
  const query: SalesQuery = useMemo(() => ({ period, status, search: debounced, page, from, to, monthKey }), [period, status, debounced, page, from, to, monthKey]);
  const bounds = salesPeriodBounds(period, new Date(), from, to);
  useEffect(() => {
    if (preview) return;
    if (query.period === "custom" && (!query.from || !query.to || !salesPeriodBounds(query.period, new Date(), query.from, query.to))) {
      setRemote({ rows: [], total: 0 }); setLoading(false); return;
    }
    let cancelled = false;
    setLoading(true);
    void readSalesPage(query).then((result) => { if (!cancelled) { setRemote(result); setLoading(false); } }).catch(() => { if (!cancelled) { setRemote({ rows: [], total: 0, error: "No pudimos consultar el historial." }); setLoading(false); } });
    return () => { cancelled = true; };
  }, [preview, query, refreshKey]);
  const filteredPreview = previewRows.filter((row) => {
    const date = row.operation_at ?? row.paid_at ?? row.created_at;
    return bounds && date >= bounds.start && date < bounds.end && (status === "all" || (status === "paid" ? row.payment_status === "paid" : row.payment_status !== "paid")) && row.customer.name.toLocaleLowerCase("es-AR").includes(debounced.trim().toLocaleLowerCase("es-AR"));
  }).sort((a, b) => (b.operation_at ?? b.created_at).localeCompare(a.operation_at ?? a.created_at) || b.id.localeCompare(a.id));
  const rows = preview ? filteredPreview.slice(page * 10, page * 10 + 10) : remote.rows;
  const total = preview ? filteredPreview.length : remote.total;
  const pages = Math.max(1, Math.ceil(total / 10));
  function close() { setSelected(null); setNotice(""); setConfirmed(false); requestAnimationFrame(() => trigger.current && document.getElementById(trigger.current)?.focus()); }
  async function collect() {
    if (!selected || !confirmed || busy) return;
    setBusy(true); setNotice("");
    try {
      if (preview) {
        const result = onPreviewCollect(selected.id);
        if (result.error) setNotice(result.error);
        else if (result.row) { setSelected(result.row); setConfirmed(false); onChanged(); }
      } else {
        const result = await collectManualPickup(selected.id, true);
        if (result.error) setNotice(result.error);
        else { setSelected({ ...selected, payment_status: "paid", fulfillment_status: "picked_up", paid_at: result.result?.paidAt, picked_up_at: result.result?.pickedUpAt, operation_at: result.result?.paidAt }); setConfirmed(false); onChanged(); }
      }
    } catch { setNotice("No pudimos completar el retiro. Reintentá."); }
    finally { setBusy(false); }
  }
  return <section className="promotions-list" aria-labelledby="admin-history-title">
    <div className="admin-records-toolbar"><h2 id="admin-history-title" className="management-section-title">Historial de ventas y retiros</h2><span>{total} registros</span></div>
    <div className="admin-order-filters">
      <label>Buscar cliente<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Nombre del cliente" /></label>
      <label>Período<select value={period} onChange={(event) => { setPeriod(event.target.value as SalesPeriod); setPage(0); }}>{periods.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      <label>Estado<select value={status} onChange={(event) => { setStatus(event.target.value as SalesStatus); setPage(0); }}><option value="all">Todos</option><option value="pending">Pendiente de retiro</option><option value="paid">Cobrado</option></select></label>
      {period === "custom" && <div className="admin-order-dates"><label>Desde<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0); }} /></label><label>Hasta<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(0); }} /></label></div>}
    </div>
    {loading && <p role="status">Cargando registros…</p>}
    {!loading && remote.error && !preview && <p role="alert" className="ui-notice">{remote.error}</p>}
    {period === "custom" && !bounds && <p role="status">Elegí una fecha inicial y final válidas.</p>}
    {!loading && !remote.error && bounds && rows.length === 0 && <p className="management-empty">No hay registros para este período y filtros.</p>}
    {!loading && rows.length > 0 && <AdminTable label="Ventas y retiros registrados" className="orders-table"><thead><tr><th scope="col">Fecha</th><th scope="col">Cliente</th><th scope="col">Estado</th><th scope="col">Total</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} id={`order-${row.id}`} tabIndex={0} aria-label={`Ver detalle de ${row.customer.name}`} onClick={() => { trigger.current = `order-${row.id}`; setSelected(row); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); trigger.current = `order-${row.id}`; setSelected(row); } }}>
      <td data-label="Fecha"><time dateTime={row.operation_at ?? row.created_at}>{orderDate(row.operation_at ?? row.created_at).date}</time><small>{orderDate(row.operation_at ?? row.created_at).time}</small></td>
      <td data-label="Cliente"><strong>{row.customer.name}</strong></td><td data-label="Estado"><span className="status-badge" data-active={row.payment_status === "paid"}>{row.fulfillment_status === "picked_up" ? "Retirado" : row.payment_status === "paid" ? "Cobrado y entregado" : "Pendiente de retiro"}</span></td>
      <td data-label="Total" className="admin-prices"><strong>{formatPrice(row.snapshot.total)}</strong></td></tr>)}</tbody></AdminTable>}
    <nav className="admin-order-pagination" aria-label="Páginas del historial"><button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page + 1} de {pages}</span><button type="button" disabled={page + 1 >= pages || loading} onClick={() => setPage((value) => value + 1)}>Siguiente</button></nav>
    {selected && <AdminDrawer title="Detalle del registro" onClose={close} busy={busy} wide><div className="admin-order-detail">
      <dl><div><dt>Cliente</dt><dd>{selected.customer.name}</dd></div><div><dt>Fecha</dt><dd>{orderDate(selected.created_at).date} · {orderDate(selected.created_at).time}</dd></div><div><dt>Estado</dt><dd>{selected.fulfillment_status === "picked_up" ? "Retirado" : selected.payment_status === "paid" ? "Cobrado y entregado" : "Pendiente de retiro"}</dd></div><div><dt>Medio de pago</dt><dd>{selected.snapshot.paymentMethod ?? "Efectivo"}</dd></div>{selected.customer.phone && <div><dt>Teléfono</dt><dd>{selected.customer.phone}</dd></div>}{selected.picked_up_at && <div><dt>Retirado</dt><dd>{orderDate(selected.picked_up_at).date} · {orderDate(selected.picked_up_at).time}</dd></div>}</dl>
      <h3>Productos</h3><ul>{selected.snapshot.lines?.map((line, index) => <li key={`${line.variantId}-${index}`}><strong>{line.quantity} × {line.name}</strong><br />{[line.label || [line.flavor, line.size, line.presentation].filter(Boolean).join(" · "), line.sku].filter(Boolean).join(" · ")}{line.unitPrice !== undefined && <> · {formatPrice(line.unitPrice)} c/u</>}{line.subtotal !== undefined && <> · {formatPrice(line.subtotal)}</>}</li>)}</ul>
      {selected.snapshot.promotion && <p>Promoción: {selected.snapshot.promotion}</p>}{selected.snapshot.discount ? <p>Descuento aplicado: {formatPrice(selected.snapshot.discount)}</p> : null}
      {selected.cost_total !== null && selected.cost_total !== undefined ? <p>Costo de mercadería al cobrar: {formatPrice(selected.cost_total)}</p> : selected.payment_status === "paid" ? <p>Costo histórico no registrado.</p> : null}
      {selected.fee_total ? <p>Comisiones registradas: {formatPrice(selected.fee_total)}</p> : null}{selected.expense_total ? <p>Otros gastos registrados: {formatPrice(selected.expense_total)}</p> : null}{selected.refund_total ? <p>Devoluciones registradas: {formatPrice(selected.refund_total)}</p> : null}<strong>Total: {formatPrice(selected.snapshot.total)}</strong>
      {selected.payment_status !== "paid" && <><p>Este pedido no reservó stock. Al confirmar se comprobarán las existencias y se descontarán una sola vez.</p><label className="checkout-choice"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Confirmo que cobré y entregué este pedido.</label><button type="button" className="button button-gold" disabled={!confirmed || busy} onClick={() => void collect()}>Marcar como retirado</button></>}
      {notice && <p role="alert" className="ui-notice">{notice}</p>}
    </div></AdminDrawer>}
  </section>;
}
