"use client";
import { useEffect, useRef, useState } from "react";
import {
  formatPrice,
  parseMoney,
  variantLabel,
  type Catalog,
} from "@/modules/catalog/model";
import {
  emptyPromotions,
  validatePromotions,
  type Promotion,
  type PromotionState,
} from "@/modules/commerce/promotions";
import { savePromotions } from "@/modules/commerce/actions";
import { previewCatalog } from "./cart-provider";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { AdminTable } from "@/components/admin/data-table";
import { IconAction } from "@/components/admin/icon-action";
import { Icon } from "@/components/ui/icon";
function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function PromotionsManager({
  initial = emptyPromotions,
  catalog: initialCatalog,
  preview = false,
  onSaved,
}: {
  initial?: PromotionState;
  catalog?: Catalog;
  preview?: boolean;
  onSaved?: (state: PromotionState) => void;
}) {
  const [state, setState] = useState(initial),
    [catalog, setCatalog] = useState(initialCatalog);
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Promotion["kind"]>("sale");
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const editor = useRef<HTMLFormElement>(null);
  const [components, setComponents] = useState<
    { variantId: string; quantity: number }[]
  >([]);
  useEffect(() => {
    if (!preview) setCatalog(initialCatalog);
  }, [initialCatalog, preview]);
  useEffect(() => {
    if (!preview) setState(initial);
  }, [initial, preview]);
  useEffect(() => {
    if (editorOpen)
      editor.current
        ?.querySelector<HTMLInputElement>('input[name="name"]')
        ?.focus();
  }, [editorOpen]);
  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setComponents([]);
    setKind("sale");
    requestAnimationFrame(() => createButton.current?.focus());
  }
  useEffect(() => {
    if (!preview) return;
    try {
      setCatalog(previewCatalog());
      const source = localStorage.getItem("stylo.promotions-preview.v1");
      if (source) {
        const saved = JSON.parse(source);
        if (validatePromotions(saved.promotions).length) throw new Error();
        setState(saved);
      }
    } catch {
      setNotice("No pudimos recuperar las promociones locales.");
    }
  }, [preview]);
  async function commit(promotions: Promotion[]) {
    if (!catalog) return false;
    const errors = validatePromotions(promotions, catalog);
    if (errors.length) {
      setNotice(errors.join(" "));
      return false;
    }
    setBusy(true);
    setNotice("");
    try {
      if (preview) {
        const source = localStorage.getItem("stylo.promotions-preview.v1"),
          current = source ? JSON.parse(source).revision : 0;
        if (current !== state.revision) {
          setNotice(
            "Otra pestaña cambió las promociones. Recargá antes de guardar.",
          );
          return false;
        }
        const next = { revision: state.revision + 1, promotions };
        localStorage.setItem(
          "stylo.promotions-preview.v1",
          JSON.stringify(next),
        );
        setState(next);
        onSaved?.(next);
        window.dispatchEvent(new Event("stylo-preview-change"));
      } else {
        const result = await savePromotions({ ...state, promotions });
        if (result.error) {
          setNotice(result.error);
          return false;
        }
        if (result.state) {
          setState(result.state);
          onSaved?.(result.state);
        }
      }
      setNotice("Promociones guardadas.");
      return true;
    } catch {
      setNotice(
        "No pudimos guardar. Revisá el almacenamiento y volvé a intentar.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!catalog) return <p role="status">Preparando promociones…</p>;
  const variants = catalog.products.flatMap((product) =>
    product.variants.map((variant) => ({
      value: variant.id,
      label: `${product.name} · ${variantLabel(variant)} · ${variant.sku}`,
    })),
  );
  return (
    <section className="promotions-manager">
      <p className="eyebrow">PRECIOS Y COMBOS</p>
      <div className="management-toolbar">
        <h1>Promociones</h1>
        {!editorOpen && (
          <button
            ref={createButton}
            type="button"
            className="button button-gold"
            disabled={busy}
            onClick={() => {
              setNotice("");
              setEditing(null);
              setKind("sale");
              setComponents([]);
              setEditorOpen(true);
            }}
          >
            <Icon name="plus" /> Crear promoción
          </button>
        )}
      </div>
      {preview && (
        <p className="preview-notice">
          Gestión de prueba · Estos cambios solo afectan este navegador.
        </p>
      )}
      <p>
        Se aplica una sola promoción: el mayor ahorro del carrito según el medio
        de pago. Las rebajas y ofertas por cantidad usan precio final por
        unidad; los combos usan precio final del conjunto.
      </p>
      {notice && (
        <p className="ui-notice" role="status">
          {notice}
        </p>
      )}
      <div className="management-layout management-create-flow">
        {!editorOpen && (
          <div className="promotions-list">
            <h2
              className="management-section-title"
              id="promotions-heading"
              tabIndex={-1}
            >
              Promociones guardadas
            </h2>
            {!state.promotions.length && (
              <p className="management-empty">
                Todavía no hay promociones. Creá una para mostrarla en la
                tienda.
              </p>
            )}
            {state.promotions.length > 0 && (
              <AdminTable
                label="Promociones guardadas"
                className="promotions-table"
              >
                <thead>
                  <tr role="row">
                    <th scope="col">Promoción</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Precios finales</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {state.promotions.map((p) => (
                    <tr key={p.id} role="row">
                      <td
                        role="cell"
                        data-label="Promoción"
                        className="admin-identity"
                      >
                        <strong>{p.name}</strong>
                        <small>
                          {p.kind === "bundle"
                            ? "Combo"
                            : p.kind === "quantity"
                              ? "Por cantidad"
                              : "Rebaja"}
                        </small>
                        <ul className="admin-line-items">
                          {p.components.map((c) => (
                            <li key={c.variantId}>
                              {variants.find((v) => v.value === c.variantId)
                                ?.label ?? "Presentación retirada"}{" "}
                              × {c.quantity}
                            </li>
                          ))}
                        </ul>
                        {p.startsAt && (
                          <small>
                            Desde {new Date(p.startsAt).toLocaleString("es-AR")}
                          </small>
                        )}
                        {p.endsAt && (
                          <small>
                            Hasta {new Date(p.endsAt).toLocaleString("es-AR")}
                          </small>
                        )}
                      </td>
                      <td role="cell" data-label="Estado">
                        <span className="status-badge" data-active={p.active}>
                          {p.active ? "Activa" : "Pausada"}
                        </span>
                      </td>
                      <td
                        role="cell"
                        data-label="Precios finales"
                        className="admin-prices"
                      >
                        <small>Lista</small>
                        <strong>{formatPrice(p.listPrice)}</strong>
                        <small>Efectivo / transferencia</small>
                        <strong>{formatPrice(p.cashPrice)}</strong>
                      </td>
                      <td role="cell" data-label="Acciones">
                        <div className="admin-row-actions">
                          <IconAction
                            label={`${p.active ? "Pausar" : "Activar"} ${p.name}`}
                            icon={p.active ? "pause" : "play"}
                            disabled={busy}
                            onClick={() =>
                              void commit(
                                state.promotions.map((item) =>
                                  item.id === p.id
                                    ? { ...item, active: !item.active }
                                    : item,
                                ),
                              )
                            }
                          />
                          <IconAction
                            label={`Editar ${p.name}`}
                            icon="edit"
                            disabled={busy}
                            onClick={() => {
                              setEditing(p);
                              setKind(p.kind);
                              setComponents(
                                p.components.map((c) => ({ ...c })),
                              );
                              setNotice("");
                              setEditorOpen(true);
                            }}
                          />
                          <ConfirmAction
                            focusAfterId="promotions-heading"
                            label={`Quitar ${p.name}`}
                            question={`¿Eliminar la promoción ${p.name}?`}
                            busy={busy}
                            onConfirm={() =>
                              commit(
                                state.promotions.filter(
                                  (item) => item.id !== p.id,
                                ),
                              )
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </div>
        )}
        {editorOpen && (
          <form
            ref={editor}
            method="post"
            key={editing?.id ?? "new"}
            className="checkout-form admin-editor promotion-editor"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget,
                data = new FormData(form);
              let list: number, cash: number;
              try {
                list = parseMoney(String(data.get("listPrice")));
                cash = parseMoney(String(data.get("cashPrice")));
              } catch {
                setNotice("Ingresá ambos precios, sin separadores de miles.");
                return;
              }
              const p: Promotion = {
                id: editing?.id ?? crypto.randomUUID(),
                name: String(data.get("name")).trim(),
                kind,
                active: editing?.active ?? true,
                components:
                  kind === "bundle"
                    ? components
                    : [
                        {
                          variantId: String(data.get("variant")),
                          quantity:
                            kind === "sale" ? 1 : Number(data.get("minimum")),
                        },
                      ],
                listPrice: list,
                cashPrice: cash,
                startsAt: data.get("startsAt")
                  ? new Date(String(data.get("startsAt"))).toISOString()
                  : null,
                endsAt: data.get("endsAt")
                  ? new Date(String(data.get("endsAt"))).toISOString()
                  : null,
              };
              if (
                await commit(
                  editing
                    ? state.promotions.map((item) =>
                        item.id === editing.id ? p : item,
                      )
                    : [...state.promotions, p],
                )
              ) {
                closeEditor();
              }
            }}
          >
            <fieldset disabled={busy}>
              <legend>
                {editing ? "Editar promoción" : "Nueva promoción"}
              </legend>
              <div className="checkout-fields">
                <label>
                  Nombre de promoción
                  <input
                    name="name"
                    maxLength={100}
                    required
                    defaultValue={editing?.name}
                  />
                </label>
                <label>
                  Tipo
                  <select
                    name="kind"
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value as Promotion["kind"]);
                      setComponents([]);
                    }}
                  >
                    <option value="sale">Rebaja de producto</option>
                    <option value="quantity">Por cantidad</option>
                    <option value="bundle">Combo</option>
                  </select>
                </label>
                {kind !== "bundle" && (
                  <label>
                    Presentación
                    <select
                      name="variant"
                      required
                      defaultValue={editing?.components[0].variantId}
                    >
                      {variants.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {kind === "quantity" && (
                  <label>
                    Mínimo de unidades
                    <input
                      name="minimum"
                      type="number"
                      min={2}
                      max={999}
                      defaultValue={editing?.components[0].quantity ?? 2}
                      required
                    />
                  </label>
                )}
                <label>
                  Precio final de lista (ARS)
                  <input
                    name="listPrice"
                    defaultValue={
                      editing ? (editing.listPrice / 100).toFixed(2) : ""
                    }
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,2})?"
                    required
                  />
                </label>
                <label>
                  Precio final efectivo / transferencia (ARS)
                  <input
                    name="cashPrice"
                    defaultValue={
                      editing ? (editing.cashPrice / 100).toFixed(2) : ""
                    }
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,2})?"
                    required
                  />
                </label>
                <label>
                  Inicio (hora local, opcional)
                  <input
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={localDate(editing?.startsAt)}
                  />
                </label>
                <label>
                  Fin (hora local, opcional)
                  <input
                    name="endsAt"
                    type="datetime-local"
                    defaultValue={localDate(editing?.endsAt)}
                  />
                </label>
              </div>
              {kind === "bundle" && (
                <div className="bundle-components">
                  {components.map((c, i) => (
                    <div className="checkout-fields" key={i}>
                      <label>
                        Presentación del combo {i + 1}
                        <select
                          value={c.variantId}
                          onChange={(e) =>
                            setComponents(
                              components.map((x, j) =>
                                i === j
                                  ? { ...x, variantId: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        >
                          {variants.map((v) => (
                            <option key={v.value} value={v.value}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Unidades del combo {i + 1}
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={c.quantity}
                          onChange={(e) =>
                            setComponents(
                              components.map((x, j) =>
                                i === j
                                  ? { ...x, quantity: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </label>
                      <IconAction
                        type="button"
                        label={`Quitar componente ${i + 1}`}
                        icon="trash"
                        onClick={() =>
                          setComponents(components.filter((_, j) => j !== i))
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={components.length >= 12 || !variants.length}
                    onClick={() =>
                      setComponents([
                        ...components,
                        {
                          variantId:
                            variants.find(
                              (v) =>
                                !components.some(
                                  (c) => c.variantId === v.value,
                                ),
                            )?.value ?? variants[0].value,
                          quantity: 1,
                        },
                      ])
                    }
                  >
                    Agregar componente
                  </button>
                </div>
              )}
              <p>
                Sin fechas, la promoción permanece vigente hasta pausarla. Si el
                precio no mejora el habitual, no se aplica.
              </p>
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
              <button className="button button-gold" disabled={busy}>
                Guardar promoción
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
