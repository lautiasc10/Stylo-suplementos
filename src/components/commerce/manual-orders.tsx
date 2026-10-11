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
export function ManualOrders({
  catalog: initial,
  orders = [],
  preview = false,
}: {
  catalog?: Catalog;
  orders?: {
    id: string;
    customer: { name: string };
    snapshot: { total: number };
    created_at: string;
  }[];
  preview?: boolean;
}) {
  const [catalog, setCatalog] = useState(initial),
    [items, setItems] = useState<CartItem[]>([]);
  const [rows, setRows] = useState(orders),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const attempt = useRef<string | null>(null),
    lock = useRef(false);
  useEffect(() => {
    if (preview)
      try {
        setCatalog(previewCatalog());
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
    <section>
      <p className="eyebrow">RETIROS MANUALES</p>
      <h1>Pedidos</h1>
      {preview && (
        <p className="preview-notice">
          Pedidos de prueba · Usá datos ficticios. Se conservan solo mientras
          esta pantalla está abierta.
        </p>
      )}
      <p>
        Las compras online se registrarán después de verificar el pago. La carga
        manual queda pendiente de cobro y retiro. No se descuenta ni se reserva
        stock con esta carga.
      </p>
      {notice && <p role="status">{notice}</p>}
      <div className="promotions-list">
        {rows.map((row) => (
          <article className="promotion-row" key={row.id}>
            <h2>{row.customer.name}</h2>
            <p>Pago pendiente · Pendiente de retiro</p>
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
          if (!lock.current) attempt.current = null;
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
          };
          try {
            if (preview) {
              const order = previewManualOrder(
                previewCatalog(),
                previewPromotions(),
                input,
              );
              if (!rows.some((row) => row.id === order.id))
                setRows([
                  {
                    id: order.id,
                    customer: order.customer,
                    snapshot: { total: order.total },
                    created_at: order.createdAt,
                  },
                  ...rows,
                ]);
            } else {
              const result = await createManualOrder(input);
              if (result.error) {
                setNotice(result.error);
                return;
              }
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
                  },
                  ...rows,
                ]);
            }
            setNotice("Pedido manual registrado: pendiente de cobro y retiro.");
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
        <fieldset>
          <legend>Cargar pedido para retirar</legend>
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
                          j === index ? { ...i, variantId: e.target.value } : i,
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
          <p>
            Se usa el precio de efectivo y se calcula la mejor promoción al
            registrar. Esta pantalla todavía no confirma cobros ni marca pedidos
            como pagados.
          </p>
          <button
            className="button button-gold"
            disabled={busy || !items.length}
          >
            Registrar retiro pendiente
          </button>
        </fieldset>
      </form>
    </section>
  );
}
