"use client";
import { useEffect, useRef, useState } from "react";
import {
  formatPrice,
  variantLabel,
  type Catalog,
} from "@/modules/catalog/model";
import {
  previewManualOrder,
  type OrderRecord,
} from "@/modules/commerce/orders";
import { createManualOrder } from "@/modules/commerce/actions";
import { previewCatalog, previewPromotions } from "./cart-provider";
import type { CartItem } from "@/modules/commerce/cart";
import { quoteCart } from "@/modules/commerce/cart";
import type { Promotion } from "@/modules/commerce/promotions";
import { AdminTable } from "@/components/admin/data-table";
import { IconAction } from "@/components/admin/icon-action";
import { Icon } from "@/components/ui/icon";
import { AdminDrawer } from "@/components/admin/drawer";
const noOrders: OrderRecord[] = [];
const noPromotions: Promotion[] = [];

export function ManualOrders({
  catalog: initial,
  orders = noOrders,
  preview = false,
  promotions: initialPromotions = noPromotions,
  onRecorded,
}: {
  catalog?: Catalog;
  orders?: OrderRecord[];
  preview?: boolean;
  promotions?: Promotion[];
  onRecorded?: (rows: OrderRecord[]) => void;
}) {
  const [catalog, setCatalog] = useState(initial),
    [items, setItems] = useState<CartItem[]>([]);
  const [rows, setRows] = useState(orders),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const attempt = useRef<string | null>(null),
    lock = useRef(false);
  const [kind, setKind] = useState<"pickup" | "cash-sale">("pickup");
  const [received, setReceived] = useState(false);
  const [recordedTotal, setRecordedTotal] = useState<number | null>(null);
  const [promotions, setPromotions] = useState(initialPromotions);
  const [editorOpen, setEditorOpen] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const editor = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (editorOpen)
      editor.current?.querySelector<HTMLSelectElement>("select")?.focus();
  }, [editorOpen]);
  function closeEditor() {
    setEditorOpen(false);
    requestAnimationFrame(() => createButton.current?.focus());
  }
  useEffect(() => {
    if (!preview) setCatalog(initial);
  }, [initial, preview]);
  useEffect(() => {
    setPromotions(initialPromotions);
  }, [initialPromotions]);
  useEffect(() => {
    setRows(orders);
  }, [orders]);
  useEffect(() => {
    if (preview)
      try {
        setCatalog(previewCatalog());
        setPromotions(previewPromotions());
      } catch {
        setNotice("No pudimos leer el catálogo de prueba.");
      }
  }, [preview]);
  if (!catalog) return <p role="status">Preparando pedidos…</p>;
  const variants = catalog.products.flatMap((p) =>
    p.variants
      .filter((v) => v.active)
      .map((v) => ({
        id: v.id,
        name: `${p.name} · ${variantLabel(v)} · ${v.sku}`,
      })),
  );
  const visibleRows = rows.filter((row) => filter === "all" || (filter === "paid" ? row.payment_status === "paid" : row.payment_status !== "paid"));
  const localDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);
  const paidToday = rows.filter((row) => row.payment_status === "paid" && localDay(new Date(row.created_at)) === localDay(new Date()));
  const pendingRows = rows.filter((row) => row.payment_status !== "paid");
  return (
    <section className="manual-orders">
      <p className="eyebrow">RETIROS MANUALES</p>
      <div className="management-toolbar">
        <h1>Ventas y retiros</h1>
        {!editorOpen && (
          <button
            ref={createButton}
            type="button"
            className="button button-gold"
            disabled={busy}
            onClick={() => {
              attempt.current = null;
              setItems([]);
              setKind("pickup");
              setReceived(false);
              setRecordedTotal(null);
              setNotice("");
              setEditorOpen(true);
            }}
          >
            <Icon name="plus" /> Crear venta o retiro
          </button>
        )}
      </div>
      {preview && (
        <p className="preview-notice">
          Pedidos de prueba · Usá datos ficticios. Se conservan solo mientras
          el panel de prueba está abierto.
        </p>
      )}
      <p>
        Registrá ventas presenciales ya cobradas en efectivo o pedidos
        pendientes de retiro. Las compras de la tienda usarán transferencia o
        Mercado Pago.
      </p>
      {notice && !editorOpen && (
        <p className="ui-notice" role="status">
          {notice}
        </p>
      )}
      <div className="management-layout management-create-flow">
        <dl className="admin-overview admin-sales-stats">
          <div className="admin-stat"><dt>Cobrado hoy</dt><dd>{formatPrice(paidToday.reduce((total, row) => total + row.snapshot.total, 0), 0)}</dd><small>{paidToday.length} operaciones en los registros cargados</small></div>
          <div className="admin-stat admin-stat-alert"><dt>Esperando retiro</dt><dd>{pendingRows.length}</dd><small>{formatPrice(pendingRows.reduce((total, row) => total + row.snapshot.total, 0), 0)} a cobrar en estos registros</small></div>
          <div className="admin-stat"><dt>Entregados</dt><dd>{rows.length - pendingRows.length}</dd><small>Entre los {rows.length} registros cargados</small></div>
        </dl>
        {(
          <div className="promotions-list">
            <div className="admin-records-toolbar"><h2 className="management-section-title">Últimos registros</h2><div className="admin-product-filter-chips">{([['all', 'Todos'], ['pending', 'Esperando retiro'], ['paid', 'Entregados']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
            {!rows.length && (
              <p className="management-empty">
                Todavía no hay registros. Usá «Crear venta o retiro» para cargar
                el primero.
              </p>
            )}
            {rows.length > 0 && (
              <AdminTable
                label="Ventas y retiros registrados"
                className="orders-table"
              >
                <thead>
                  <tr role="row">
                    <th scope="col">Cliente</th>
                    <th scope="col">Productos</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {visibleRows.map((row) => (
                    <tr role="row" key={row.id}>
                      <td
                        role="cell"
                        data-label="Cliente"
                        className="admin-identity"
                      >
                        <strong>{row.customer.name}</strong>
                        {row.customer.phone && (
                          <small>Tel.: {row.customer.phone}</small>
                        )}
                        <small>
                          {row.payment_status === "paid"
                            ? "Venta presencial"
                            : "Retiro manual"}
                        </small>
                      </td>
                      <td role="cell" data-label="Productos">
                        {row.snapshot.lines?.length ? (
                          <ul className="admin-line-items">
                            {row.snapshot.lines.map((line, index) => (
                              <li key={`${line.variantId}-${index}`}>
                                <strong>
                                  {line.quantity} × {line.name}
                                </strong>
                                <small>
                                  {line.label ||
                                    [line.flavor, line.size, line.presentation]
                                      .filter(Boolean)
                                      .join(" · ")}
                                </small>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <small>Detalle no disponible.</small>
                        )}
                      </td>
                      <td role="cell" data-label="Fecha">
                        <time dateTime={row.created_at}>
                          {new Date(row.created_at).toLocaleDateString("es-AR")}
                        </time>
                        <small>
                          {new Date(row.created_at).toLocaleTimeString(
                            "es-AR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </small>
                      </td>
                      <td role="cell" data-label="Estado">
                        <span
                          className="status-badge"
                          data-active={row.payment_status === "paid"}
                        >
                          {row.payment_status === "paid"
                            ? "Efectivo cobrado"
                            : "Pago pendiente"}
                        </span>
                        <small>
                          {row.payment_status === "paid"
                            ? "Entregado"
                            : "Pendiente de retiro"}
                        </small>
                      </td>
                      <td
                        role="cell"
                        data-label="Total"
                        className="admin-prices"
                      >
                        <strong>{formatPrice(row.snapshot.total)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            )}
            {rows.length > 0 && visibleRows.length === 0 && <p className="management-empty">No hay registros con este estado.</p>}
          </div>
        )}
        {editorOpen && (
          <AdminDrawer title="Nuevo registro" onClose={closeEditor} busy={busy}>
          <form
            ref={editor}
            method="post"
            className="checkout-form admin-editor"
            onChange={() => {
              if (!lock.current) {
                attempt.current = null;
                setRecordedTotal(null);
              }
            }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setNotice("");
              const data = new FormData(event.currentTarget);
              attempt.current ??= crypto.randomUUID();
              const input = {
                requestId: attempt.current,
                items,
                customer: {
                  name: String(data.get("name") ?? "").trim(),
                  phone: String(data.get("phone") ?? "").trim(),
                },
                kind,
                received,
              };
              try {
                if (preview) {
                  if (rows.some((row) => row.id === input.requestId)) {
                    setNotice("Este registro ya fue guardado. No se duplicó.");
                    return;
                  }
                  const currentCatalog = previewCatalog();
                  const order = previewManualOrder(
                    currentCatalog,
                    previewPromotions(),
                    input,
                  );
                  setRecordedTotal(order.total);
                  if (!rows.some((row) => row.id === order.id)) {
                    if (kind === "cash-sale") {
                      const updated = {
                        ...currentCatalog,
                        revision: currentCatalog.revision + 1,
                        products: currentCatalog.products.map((p) => ({
                          ...p,
                          variants: p.variants.map((v) => ({
                            ...v,
                            stock:
                              v.stock -
                              (items.find((i) => i.variantId === v.id)
                                ?.quantity ?? 0),
                          })),
                        })),
                      };
                      const source = localStorage.getItem(
                        "stylo.catalog-preview.v1",
                      );
                      const saved = source
                        ? JSON.parse(source)
                        : { images: {} };
                      localStorage.setItem(
                        "stylo.catalog-preview.v1",
                        JSON.stringify({ ...saved, catalog: updated }),
                      );
                      setCatalog(updated);
                      window.dispatchEvent(new Event("stylo-preview-change"));
                    }
                    const nextRows = [
                      {
                        id: order.id,
                        customer: order.customer,
                        snapshot: {
                          total: order.total,
                          lines: order.snapshot.lines,
                        },
                        created_at: order.createdAt,
                        payment_status: order.paymentStatus,
                      },
                      ...rows,
                    ];
                    setRows(nextRows);
                    onRecorded?.(nextRows);
                  }
                } else {
                  const result = await createManualOrder(input);
                  if (result.error) {
                    setNotice(result.error);
                    return;
                  }
                  if (result.order)
                    setRecordedTotal(result.order.snapshot.total);
                  if (
                    result.order &&
                    !rows.some((row) => row.id === result.order.id)
                  ) {
                    const nextRows = [
                      {
                        id: result.order.id,
                        customer: input.customer,
                        snapshot: result.order.snapshot,
                        created_at: new Date().toISOString(),
                        payment_status:
                          kind === "cash-sale" ? "paid" : "pending",
                      },
                      ...rows,
                    ];
                    setRows(nextRows);
                    onRecorded?.(nextRows);
                  }
                }
                setNotice(
                  kind === "cash-sale"
                    ? "Venta en efectivo registrada. Stock actualizado."
                    : "Pedido manual registrado: pendiente de cobro y retiro.",
                );
                closeEditor();
              } catch (error) {
                setNotice(
                  error instanceof Error && preview
                    ? error.message
                    : "No pudimos registrar el pedido.",
                );
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {notice && <p className="ui-notice" role="status">{notice}</p>}
            <fieldset disabled={busy}>
              <legend>Nuevo registro</legend>
              <fieldset className="admin-type-options admin-type-options-two"><legend>¿Qué querés anotar?</legend>
                {([['cash-sale', 'Venta presencial en efectivo', 'Ya pagó y se lleva el producto. Se descuenta del stock.'], ['pickup', 'Pedido pendiente de retiro', 'Lo anotás ahora y lo cobrás cuando venga. No reserva stock.']] as const).map(([value, label, detail]) => <label className="admin-choice-card" key={value}><input type="radio" name="recordKind" value={value} aria-label={label} checked={kind === value} onChange={() => { setKind(value); setReceived(false); }} /><Icon name={value === "cash-sale" ? "cart" : "bag"} /><strong>{label}</strong><small>{detail}</small></label>)}
              </fieldset>
              <div className="checkout-fields">
                <label>
                  Nombre del cliente
                  <input name="name" required maxLength={100} />
                </label>
                <label>
                  Teléfono del cliente (opcional)
                  <input name="phone" type="tel" maxLength={30} />
                </label>
              </div>
              <div className="bundle-components">
                {items.map((item, index) => (
                  <div className="checkout-fields" key={index}>
                    <label>
                      Presentación {index + 1}
                      <select
                        value={item.variantId}
                        onChange={(e) => {
                          attempt.current = null;
                          setItems(
                            items.map((i, j) =>
                              j === index
                                ? { ...i, variantId: e.target.value }
                                : i,
                            ),
                          );
                        }}
                      >
                        {variants.map((v) => (
                          <option value={v.id} key={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Cantidad {index + 1}
                      <input
                        type="number"
                        min={1}
                        max={999}
                        required
                        value={item.quantity}
                        onChange={(e) => {
                          attempt.current = null;
                          setItems(
                            items.map((i, j) =>
                              j === index
                                ? { ...i, quantity: Number(e.target.value) }
                                : i,
                            ),
                          );
                        }}
                      />
                    </label>
                    <IconAction
                      icon="trash"
                      label={`Quitar presentación ${index + 1}`}
                      type="button"
                      onClick={() => {
                        attempt.current = null;
                        setItems(items.filter((_, j) => j !== index));
                      }}
                    />
                  </div>
                ))}
                <button
                  className="button button-outline"
                  type="button"
                  disabled={busy || items.length >= 30 || !variants.length}
                  onClick={() => {
                    attempt.current = null;
                    setItems([
                      ...items,
                      {
                        variantId:
                          variants.find(
                            (v) => !items.some((i) => i.variantId === v.id),
                          )?.id ?? variants[0].id,
                        quantity: 1,
                      },
                    ]);
                  }}
                >
                  Agregar presentación
                </button>
              </div>
              {items.length > 0 && (
                <p className="manual-total">
                  {recordedTotal !== null
                    ? "Total registrado en efectivo:"
                    : "Total en efectivo:"}{" "}
                  <strong>
                    {formatPrice(
                      recordedTotal ??
                        quoteCart(catalog, items, promotions).cashPricing.total,
                    )}
                  </strong>
                  <span>
                    El total definitivo se calcula al registrar, con precios y
                    promociones vigentes.
                  </span>
                </p>
              )}
              <p>
                {kind === "cash-sale"
                  ? "Registrá únicamente una venta ya cobrada y entregada. Se descontarán las unidades del stock."
                  : "Se calcula el precio de efectivo. El pedido queda pendiente de cobro y retiro, sin reservar ni descontar stock."}
              </p>
              {kind === "cash-sale" && (
                <label className="checkout-choice">
                  <input
                    type="checkbox"
                    required
                    checked={received}
                    onChange={(e) => setReceived(e.target.checked)}
                  />
                  Confirmo que cobré el efectivo y entregué los productos.
                </label>
              )}
            </fieldset>
            <div className="editor-actions">
              <button
                type="button"
                className="button button-outline"
                disabled={busy}
                onClick={closeEditor}
              >
                Cancelar
              </button>
              <button
                className="button button-gold"
                disabled={
                  busy || !items.length || (kind === "cash-sale" && !received)
                }
              >
                {kind === "cash-sale"
                  ? "Registrar venta en efectivo"
                  : "Registrar retiro pendiente"}
              </button>
            </div>
          </form>
          </AdminDrawer>
        )}
      </div>
    </section>
  );
}
