"use client";
import { useEffect, useRef, useState } from "react";
import {
  formatPrice,
  parseMoney,
  variantLabel,
  variantImages,
  type Catalog,
} from "@/modules/catalog/model";
import { normalizeSearch } from "@/modules/catalog/search";
import {
  emptyPromotions,
  promotionStockWarnings,
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
import { AdminDrawer } from "@/components/admin/drawer";
import { ProductThumbnail } from "@/components/ui/product-thumbnail";
import { SearchableVariantSelect } from "./searchable-variant-select";
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
  imageBase = "",
  onSaved,
}: {
  initial?: PromotionState;
  catalog?: Catalog;
  preview?: boolean;
  imageBase?: string;
  onSaved?: (state: PromotionState) => void;
}) {
  const [state, setState] = useState(initial),
    [catalog, setCatalog] = useState(initialCatalog);
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Promotion["kind"]>("sale");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [minimum, setMinimum] = useState(2);
  const [promotionQuery, setPromotionQuery] = useState("");
  const [promotionPage, setPromotionPage] = useState(0);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const editorOpener = useRef<HTMLButtonElement | null>(null);
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
    setSelectedVariant("");
    setMinimum(2);
    requestAnimationFrame(() => (editorOpener.current?.isConnected ? editorOpener.current : createButton.current)?.focus());
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
  async function commit(promotions: Promotion[], image?: FormData) {
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
        const result = await savePromotions({ ...state, promotions }, image);
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
  const promotionTerms = normalizeSearch(promotionQuery)
    .split(/\s+/)
    .filter(Boolean);
  const filteredPromotions = state.promotions.filter((promotion) => {
    const text = normalizeSearch(
      [
        promotion.name,
        promotion.kind,
        ...promotion.components.map(
          (component) =>
            variants.find((variant) => variant.value === component.variantId)
              ?.label ?? "",
        ),
      ].join(" "),
    );
    return promotionTerms.every((term) => text.includes(term));
  });
  const pageCount = Math.max(1, Math.ceil(filteredPromotions.length / 10));
  const currentPage = Math.min(promotionPage, pageCount - 1);
  const visiblePromotions = filteredPromotions.slice(
    currentPage * 10,
    (currentPage + 1) * 10,
  );
  const draftComponents = kind === "bundle"
    ? components
    : selectedVariant
      ? [{ variantId: selectedVariant, quantity: kind === "quantity" ? minimum : 1 }]
      : [];
  const draftStockWarnings = promotionStockWarnings(catalog, draftComponents);
  const imageFor = (promotion: Promotion) => {
    if (promotion.kind === "bundle" && promotion.imagePath && imageBase)
      return `${imageBase}/${promotion.imagePath}`;
    const first = promotion.components[0];
    const product = catalog.products.find((item) =>
      item.variants.some((variant) => variant.id === first?.variantId),
    );
    const path =
      product && first && variantImages(product, first.variantId)[0]?.path;
    return path && imageBase ? `${imageBase}/${path}` : undefined;
  };
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
            onClick={(event) => {
              editorOpener.current = event.currentTarget;
              setNotice("");
              setEditing(null);
              setKind("sale");
              setSelectedVariant(variants[0]?.value ?? "");
              setComponents([]);
              setMinimum(2);
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
      {notice && !editorOpen && (
        <p className="ui-notice" role="status">
          {notice}
        </p>
      )}
      <div className="management-layout management-create-flow">
        {(
          <div className="promotions-list">
            <h2
              className="management-section-title"
              id="promotions-heading"
              tabIndex={-1}
            >
              Promociones guardadas
            </h2>
            <div className="admin-product-search">
              <label htmlFor="admin-promotion-query">Buscar promociones</label>
              <input
                id="admin-promotion-query"
                type="search"
                value={promotionQuery}
                onChange={(event) => {
                  setPromotionQuery(event.target.value);
                  setPromotionPage(0);
                }}
                placeholder="Promoción, producto, sabor o SKU"
                autoComplete="off"
              />
              <span aria-live="polite">
                {filteredPromotions.length} de {state.promotions.length}{" "}
                promociones
              </span>
            </div>
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
                  {visiblePromotions.map((p) => (
                    <tr key={p.id} role="row">
                      <td
                        role="cell"
                        data-label="Promoción"
                        className="admin-identity"
                      >
                        <div className="admin-promotion-identity">
                          <ProductThumbnail
                            src={imageFor(p)}
                            alt=""
                            size={96}
                          />
                          <strong>{p.name}</strong>
                        </div>
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
                        <span
                          className="status-badge"
                          data-active={p.active && (p.maxUses == null || (p.used ?? 0) < p.maxUses) && promotionStockWarnings(catalog, p.components).length === 0}
                        >
                          {p.active && p.maxUses != null && (p.used ?? 0) >= p.maxUses
                            ? "Cupo agotado"
                            : p.active ? "Activa" : "Pausada"}
                        </span>
                        {p.active && promotionStockWarnings(catalog, p.components).length > 0 && (
                          <small className="promotion-stock-warning">
                            Sin stock suficiente: no aparece en la tienda.
                          </small>
                        )}
                        {p.maxUses != null && (
                          <small className="promotion-usage">
                            Cupo: {p.used ?? 0} de {p.maxUses} usados
                          </small>
                        )}
                      </td>
                      <td
                        role="cell"
                        data-label="Precios finales"
                        className="admin-prices"
                      >
                        <small>Efectivo / transferencia</small>
                        <strong>{formatPrice(p.cashPrice)}</strong>
                        <small>Lista {formatPrice(p.listPrice)}</small>
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
                            onClick={(event) => {
                              editorOpener.current = event.currentTarget;
                              setEditing(p);
                              setKind(p.kind);
                              setSelectedVariant(
                                p.kind === "bundle"
                                  ? ""
                                  : (p.components[0]?.variantId ?? ""),
                              );
                              setComponents(
                                p.components.map((c) => ({ ...c })),
                              );
                              setMinimum(p.kind === "quantity" ? p.components[0].quantity : 2);
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
            {state.promotions.length > 0 && filteredPromotions.length === 0 && (
              <p className="management-empty" role="status">
                No encontramos promociones con esa búsqueda.
              </p>
            )}
            {pageCount > 1 && (
              <nav
                className="admin-pagination"
                aria-label="Páginas de promociones"
              >
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPromotionPage(currentPage - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {currentPage + 1} de {pageCount}
                </span>
                <button
                  type="button"
                  disabled={currentPage === pageCount - 1}
                  onClick={() => setPromotionPage(currentPage + 1)}
                >
                  Siguiente
                </button>
              </nav>
            )}
          </div>
        )}
        {editorOpen && (
          <AdminDrawer title={editing ? "Editar promoción" : "Nueva promoción"} onClose={closeEditor} busy={busy}>
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
                maxUses: data.get("maxUses")
                  ? Number(data.get("maxUses"))
                  : null,
                startsAt: data.get("startsAt")
                  ? new Date(String(data.get("startsAt"))).toISOString()
                  : null,
                endsAt: data.get("endsAt")
                  ? new Date(String(data.get("endsAt"))).toISOString()
                  : null,
                imagePath:
                  kind === "bundle" && !data.has("removeImage")
                    ? (editing?.imagePath ?? null)
                    : null,
                used: editing?.used ?? 0,
              };
              const image = data.get("comboImage");
              const upload =
                kind === "bundle" && image instanceof File && image.size > 0
                  ? new FormData()
                  : undefined;
              if (upload) {
                if (preview) {
                  setNotice(
                    "La foto del combo se sube desde el administrador real; esta vista previa es local.",
                  );
                  return;
                }
                if (image instanceof File) upload.set("file", image);
                upload.set("promotionId", p.id);
              }
              if (
                await commit(
                  editing
                    ? state.promotions.map((item) =>
                        item.id === editing.id ? p : item,
                      )
                    : [...state.promotions, p],
                  upload,
                )
              ) {
                setPromotionQuery("");
                if (!editing)
                  setPromotionPage(Math.floor(state.promotions.length / 10));
                closeEditor();
              }
            }}
          >
            {notice && <p className="ui-notice" role="status">{notice}</p>}
            <fieldset disabled={busy}>
              <legend>
                {editing ? "Editar promoción" : "Nueva promoción"}
              </legend>
              <fieldset className="admin-type-options"><legend>¿Qué tipo de promoción?</legend>
                {([['sale', 'Rebaja', 'Bajás el precio de un producto.'], ['quantity', 'Por cantidad', 'Mejor precio al llevar varias unidades.'], ['bundle', 'Combo', 'Varios productos juntos a un precio.']] as const).map(([value, label, detail]) => <label className="admin-choice-card" key={value}><input type="radio" name="kind" value={value} aria-label={label} checked={kind === value} onChange={() => { setKind(value); setComponents([]); setMinimum(2); if (!selectedVariant) setSelectedVariant(variants[0]?.value ?? ""); }} /><Icon name={value === "bundle" ? "bag" : "bolt"} /><strong>{label}</strong><small>{detail}</small></label>)}
              </fieldset>
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
                {kind !== "bundle" && (
                  <SearchableVariantSelect
                    label="Presentación"
                    name="variant"
                    value={selectedVariant}
                    options={variants}
                    onChange={setSelectedVariant}
                  />
                )}
                {kind === "quantity" && (
                  <label>
                    Mínimo de unidades
                    <input
                      name="minimum"
                      type="number"
                      min={2}
                      max={999}
                      value={minimum}
                      onChange={(event) => setMinimum(Number(event.target.value))}
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
                <label>
                  Cupo de unidades promocionadas (opcional)
                  <input
                    name="maxUses"
                    type="number"
                    min={1}
                    max={1000000}
                    step={1}
                    defaultValue={editing?.maxUses ?? ""}
                    placeholder="Sin límite"
                  />
                </label>
              </div>
              <p className="promotion-usage-note">
                Las rebajas y ofertas por cantidad cuentan unidades con descuento;
                los combos cuentan combos completos. Solo las ventas cobradas consumen cupo.
              </p>
              {editing?.maxUses != null && (
                <p className="promotion-usage-note">
                  Ya se usaron {editing.used ?? 0} de {editing.maxUses} cupos.
                </p>
              )}
              {draftStockWarnings.length > 0 && (
                <div className="promotion-stock-warning" role="status">
                  <strong>Esta promoción no aparecerá en la tienda mientras falte stock:</strong>
                  <ul>{draftStockWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </div>
              )}
              {kind === "bundle" && (
                <div className="bundle-components">
                  <label className="combo-image-input">
                    Foto del combo (opcional, JPEG, PNG o WebP, hasta 5 MB)
                    <input
                      type="file"
                      name="comboImage"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={preview}
                    />
                  </label>
                  {editing?.imagePath && imageBase && (
                    <div className="combo-current-image">
                      <ProductThumbnail
                        src={`${imageBase}/${editing.imagePath}`}
                        alt={`Foto actual de ${editing.name}`}
                        size={160}
                      />
                      <label>
                        <input type="checkbox" name="removeImage" /> Quitar foto
                        actual
                      </label>
                    </div>
                  )}
                  {components.map((c, i) => (
                    <div className="checkout-fields" key={i}>
                      <SearchableVariantSelect
                        label={`Presentación del combo ${i + 1}`}
                        value={c.variantId}
                        options={variants}
                        onChange={(value) =>
                          setComponents(
                            components.map((x, j) =>
                              i === j ? { ...x, variantId: value } : x,
                            ),
                          )
                        }
                      />
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
          </AdminDrawer>
        )}
      </div>
    </section>
  );
}
