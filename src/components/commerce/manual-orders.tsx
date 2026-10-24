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
import { IconAction } from "@/components/admin/icon-action";
import { Icon } from "@/components/ui/icon";
import { AdminDrawer } from "@/components/admin/drawer";
import { OrderHistory } from "./order-history";
import { VariantFinder } from "./variant-finder";
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
  const [historyVersion, setHistoryVersion] = useState(0);
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
      editor.current?.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus();
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
  const variants = catalog.products.filter((p) => p.active).flatMap((p) =>
    p.variants
      .filter((v) => v.active)
      .map((v) => ({
        id: v.id,
        name: `${p.name} · ${variantLabel(v)} · ${v.sku}`,
        stock: v.stock,
      })),
  );
  const stockIssues = items.flatMap((item) => {
    const variant = variants.find((candidate) => candidate.id === item.variantId);
    if (!variant) return ["Elegí una presentación para cada línea."];
    if (variant.stock === 0) return [`${variant.name}: sin stock.`];
    if (item.quantity > variant.stock) return [`${variant.name}: pediste ${item.quantity} y quedan ${variant.stock}.`];
    if (!Number.isInteger(item.quantity) || item.quantity < 1) return ["Ingresá una cantidad válida."];
    return [];
  });
  function previewCostTotal(lines: { variantId: string; quantity: number }[]) {
    try {
      const costs = JSON.parse(localStorage.getItem("stylo.purchase-costs-preview.v1") ?? "{}") as Record<string, number>;
      if (lines.some((line) => !Number.isSafeInteger(costs[line.variantId]) || costs[line.variantId] < 0)) return null;
      return lines.reduce((total, line) => total + costs[line.variantId] * line.quantity, 0);
    } catch { return null; }
  }
  function collectPreview(id: string) {
    const target = rows.find((row) => row.id === id);
    if (!target) return { error: "No encontramos el pedido." };
    if (target.payment_status === "paid") return { row: target };
    const current = previewCatalog();
    const lines = target.snapshot.lines ?? [];
    for (const line of lines) {
      const variant = current.products.flatMap((product) => product.variants).find((item) => item.id === line.variantId);
      if (!variant || variant.stock < line.quantity) return { error: `No hay stock suficiente para ${line.name}.` };
    }
    const updated = { ...current, revision: current.revision + 1, products: current.products.map((product) => ({ ...product,
      variants: product.variants.map((variant) => ({ ...variant, stock: variant.stock - lines.filter((line) => line.variantId === variant.id).reduce((sum, line) => sum + line.quantity, 0) })),
    })) };
    const source = localStorage.getItem("stylo.catalog-preview.v1");
    const saved = source ? JSON.parse(source) : { images: {} };
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify({ ...saved, catalog: updated }));
    setCatalog(updated);
    window.dispatchEvent(new Event("stylo-preview-change"));
    const at = new Date().toISOString();
    const row = { ...target, payment_status: "paid", fulfillment_status: "picked_up", paid_at: at, picked_up_at: at, operation_at: at, cost_total: previewCostTotal(lines) };
    const nextRows = rows.map((item) => item.id === id ? row : item);
    setRows(nextRows);
    onRecorded?.(nextRows);
    return { row };
  }
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
        <OrderHistory preview={preview} previewRows={rows} refreshKey={historyVersion} onPreviewCollect={collectPreview} onChanged={() => { setHistoryVersion((value) => value + 1); if (!preview) void onRecorded?.(rows); }} />
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
              if (stockIssues.length) { setNotice(stockIssues.join(" ")); return; }
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
                          base: order.snapshot.cashPricing.base,
                          discount: order.snapshot.cashPricing.discount,
                          promotion: order.snapshot.cashPricing.promotion,
                          lines: order.snapshot.lines.map((line) => ({ ...line, unitPrice: line.cashPrice, subtotal: line.cashPrice * line.quantity })),
                          paymentMethod: "efectivo",
                        },
                        created_at: order.createdAt,
                        operation_at: order.createdAt,
                        payment_status: order.paymentStatus,
                        fulfillment_status: order.fulfillmentStatus,
                        paid_at: kind === "cash-sale" ? order.createdAt : null,
                        cost_total: kind === "cash-sale" ? previewCostTotal(order.snapshot.lines) : null,
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
                        fulfillment_status: kind === "cash-sale" ? "delivered" : "pending_pickup",
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
                setHistoryVersion((value) => value + 1);
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
                    <VariantFinder catalog={catalog} value={item.variantId} index={index} excluded={items.filter((_, i) => i !== index).map((other) => other.variantId)}
                      onSelect={(id) => {
                          attempt.current = null;
                          setItems(
                            items.map((i, j) =>
                              j === index
                                ? { ...i, variantId: id }
                                : i,
                            ),
                          );
                        }} />
                    <label>
                      Cantidad {index + 1}
                      <input
                        type="number"
                        min={1}
                        max={Math.min(999, variants.find((variant) => variant.id === item.variantId)?.stock ?? 999)}
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
                        variantId: "",
                        quantity: 1,
                      },
                    ]);
                  }}
                >
                  Agregar presentación
                </button>
              </div>
              {stockIssues.length > 0 && <p className="admin-stock-warning" role="alert">{stockIssues.join(" ")}</p>}
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
                  busy || !items.length || stockIssues.length > 0 || (kind === "cash-sale" && !received)
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
