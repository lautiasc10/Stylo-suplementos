"use client";
import { useEffect, useRef, useState } from "react";
import {
  formatPrice,
  variantLabel,
  type Catalog,
} from "@/modules/catalog/model";
import { previewManualOrder } from "@/modules/commerce/orders";
import { createManualOrder } from "@/modules/commerce/actions";
import { previewCatalog, previewPromotions } from "./cart-provider";
import type { CartItem } from "@/modules/commerce/cart";
import { quoteCart } from "@/modules/commerce/cart";
import type { Promotion } from "@/modules/commerce/promotions";
export function ManualOrders({
  catalog: initial,
  orders = [],
  preview = false,
  promotions: initialPromotions = [],
}: {
  catalog?: Catalog;
  orders?: {
    id: string;
    customer: { name: string };
    snapshot: { total: number };
    created_at: string;
    payment_status?: string;
  }[];
  preview?: boolean;
  promotions?: Promotion[];
}) {
  const [catalog, setCatalog] = useState(initial),
    [items, setItems] = useState<CartItem[]>([]);
  const [rows, setRows] = useState(orders),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const attempt = useRef<string | null>(null),
    lock = useRef(false);
  const [kind, setKind] = useState<"pickup" | "cash-sale">("pickup");
  const [received, setReceived] = useState(false);
  const [recordedTotal, setRecordedTotal] = useState<number | null>(null);
  const [promotions, setPromotions] = useState(initialPromotions);
  useEffect(() => {
    if (!preview) setCatalog(initial);
  }, [initial, preview]);
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
  return (
    <section className="manual-orders">
      <p className="eyebrow">RETIROS MANUALES</p>
      <h1>Ventas y retiros</h1>
      {preview && (
        <p className="preview-notice">
          Pedidos de prueba · Usá datos ficticios. Se conservan solo mientras
          esta pantalla está abierta.
        </p>
      )}
      <p>
        Registrá ventas presenciales ya cobradas en efectivo o pedidos
        pendientes de retiro. Las compras de la tienda usarán transferencia o
        Mercado Pago.
      </p>
      {notice && (
        <p className="ui-notice" role="status">
          {notice}
        </p>
      )}
      <div className="management-layout">
        <div className="promotions-list">
          <h2 className="management-section-title">Últimos registros</h2>
          {!rows.length && (
            <p className="management-empty">
              Todavía no hay registros. Cargá una venta o un retiro desde el
              formulario.
            </p>
          )}
          {rows.map((row) => (
            <article className="promotion-row" key={row.id}>
              <h2>{row.customer.name}</h2>
              <p className="order-status">
                {row.payment_status === "paid"
                  ? "Efectivo cobrado · Entregado"
                  : "Pago pendiente · Pendiente de retiro"}
              </p>
              <p>
                {formatPrice(row.snapshot.total)} ·{" "}
                {new Date(row.created_at).toLocaleString("es-AR")}
              </p>
              <p>Referencia: {row.id}</p>
            </article>
          ))}
        </div>
        <form
          method="post"
          className="checkout-form"
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
                    const saved = source ? JSON.parse(source) : { images: {} };
                    localStorage.setItem(
                      "stylo.catalog-preview.v1",
                      JSON.stringify({ ...saved, catalog: updated }),
                    );
                    setCatalog(updated);
                    window.dispatchEvent(new Event("stylo-preview-change"));
                  }
                  setRows([
                    {
                      id: order.id,
                      customer: order.customer,
                      snapshot: { total: order.total },
                      created_at: order.createdAt,
                      payment_status: order.paymentStatus,
                    },
                    ...rows,
                  ]);
                }
              } else {
                const result = await createManualOrder(input);
                if (result.error) {
                  setNotice(result.error);
                  return;
                }
                if (result.order) setRecordedTotal(result.order.snapshot.total);
                if (
                  result.order &&
                  !rows.some((row) => row.id === result.order.id)
                )
                  setRows([
                    {
                      id: result.order.id,
                      customer: input.customer,
                      snapshot: result.order.snapshot,
                      created_at: new Date().toISOString(),
                      payment_status: kind === "cash-sale" ? "paid" : "pending",
                    },
                    ...rows,
                  ]);
              }
              setNotice(
                kind === "cash-sale"
                  ? "Venta en efectivo registrada. Stock actualizado."
                  : "Pedido manual registrado: pendiente de cobro y retiro.",
              );
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
          <fieldset disabled={busy}>
            <legend>Nuevo registro</legend>
            <label>
              Tipo de registro
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as typeof kind);
                  setReceived(false);
                }}
              >
                <option value="pickup">Pedido pendiente de retiro</option>
                <option value="cash-sale">Venta presencial en efectivo</option>
              </select>
            </label>
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
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => {
                      attempt.current = null;
                      setItems(items.filter((_, j) => j !== index));
                    }}
                  >
                    Quitar presentación {index + 1}
                  </button>
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
            <div className="management-actions">
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
          </fieldset>
        </form>
      </div>
    </section>
  );
}
