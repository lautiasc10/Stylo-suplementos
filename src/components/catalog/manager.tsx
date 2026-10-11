"use client";
import { useState, type FormEvent } from "react";
import {
  importColumns,
  planImport,
  readImportFile,
  type ImportPlan,
} from "@/modules/catalog/import";
import {
  formatPrice,
  variantLabel,
  parseMoney,
  slugify,
  validateCatalog,
  publicCatalog,
  type Catalog,
  type CatalogGroup,
  type Product,
  type ProductImage,
} from "@/modules/catalog/model";

export function CatalogManager({
  catalog,
  commit,
  upload,
  imageUrls = {},
  imageBase = "",
}: {
  catalog: Catalog;
  commit: (next: Catalog) => Promise<{ error?: string }>;
  upload: (
    file: File,
    productId: string,
  ) => Promise<{ path?: string; error?: string }>;
  imageUrls?: Record<string, string>;
  imageBase?: string;
}) {
  const [tab, setTab] = useState("products"),
    [draft, setDraft] = useState<Product | null>(null),
    [plan, setPlan] = useState<ImportPlan | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [group, setGroup] = useState<CatalogGroup | null>(null),
    [fileName, setFileName] = useState("");
  async function save(next: Catalog) {
    const errors = validateCatalog(next);
    if (errors.length) {
      setMessage(errors.join(" "));
      return false;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await commit(next);
      if (result.error) {
        setMessage(result.error);
        return false;
      }
      setMessage("Cambios guardados.");
      return true;
    } catch {
      setMessage("No pudimos guardar. Tus cambios no se aplicaron.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  function newProduct() {
    if (!catalog.brands.length || !catalog.categories.length) {
      setMessage("Cargá una marca y una categoría antes de crear productos.");
      return;
    }
    setDraft({
      id: crypto.randomUUID(),
      name: "",
      slug: "",
      brandId: catalog.brands[0].id,
      categoryIds: [catalog.categories[0].id],
      description: "",
      tags: [],
      active: false,
      featured: false,
      seoTitle: "",
      seoDescription: "",
      version: 0,
      variants: [newVariant()],
      images: [],
    });
  }
  function newVariant() {
    return {
      id: crypto.randomUUID(),
      sku: "",
      flavor: "",
      size: "",
      presentation: "",
      listPrice: 0,
      cashPrice: 0,
      stock: 0,
      active: true,
    };
  }
  function updateDraft(key: keyof Product, value: Product[keyof Product]) {
    setDraft((previous) => (previous ? { ...previous, [key]: value } : null));
  }
  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    try {
      const form = new FormData(event.currentTarget);
      const product = {
        ...draft,
        version: draft.version + 1,
        variants: draft.variants.map((variant) => ({
          ...variant,
          listPrice: parseMoney(String(form.get(`list-${variant.id}`))),
          cashPrice: parseMoney(String(form.get(`cash-${variant.id}`))),
        })),
      };
      const next = {
        ...catalog,
        products: catalog.products.some((item) => item.id === product.id)
          ? catalog.products.map((item) =>
              item.id === product.id ? product : item,
            )
          : [...catalog.products, product],
      };
      if (await save(next)) setDraft(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Revisá los precios.",
      );
    }
  }
  async function addImages(files: FileList | null) {
    if (!files || !draft) return;
    if (draft.images.length + files.length > 12) {
      setMessage("Se permiten hasta 12 imágenes por producto.");
      return;
    }
    setBusy(true);
    setMessage("");
    const images: ProductImage[] = [];
    try {
      for (const file of Array.from(files)) {
        const result = await upload(file, draft.id);
        if (result.error || !result.path)
          throw new Error(result.error || "No pudimos subir la imagen.");
        images.push({
          id: crypto.randomUUID(),
          path: result.path,
          alt: draft.name || "Imagen del producto",
          variantId: null,
          position: draft.images.length + images.length,
        });
      }
      updateDraft("images", [...draft.images, ...images]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No pudimos cargar imágenes.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addBrandLogo(file?: File) {
    if (!file || !group) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await upload(file, group.id);
      if (result.error || !result.path)
        throw new Error(result.error || "No pudimos cargar el logo.");
      setGroup((previous) =>
        previous ? { ...previous, logo: result.path } : null,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No pudimos cargar el logo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function prepare(file?: File) {
    setPlan(null);
    setMessage("");
    if (!file) return;
    setBusy(true);
    setFileName(file.name);
    try {
      setPlan(planImport(await readImportFile(file), catalog));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No pudimos leer el archivo.",
      );
    } finally {
      setBusy(false);
    }
  }
  const groups = tab === "brands" ? catalog.brands : catalog.categories;
  const lowStock = publicCatalog(catalog).products
    .flatMap((product) =>
      product.variants
        .filter(
          (variant) =>
            variant.active && variant.stock <= (catalog.lowStockThreshold ?? 0),
        )
        .map((variant) => ({ product, variant })),
    );
  return (
    <div className="catalog-manager">
      <nav className="manager-tabs" aria-label="Gestión del catálogo">
        {[
          ["products", "Productos"],
          ["brands", "Marcas"],
          ["categories", "Categorías"],
          ["import", "Carga masiva"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? "page" : undefined}
            onClick={() => {
              setTab(key);
              setDraft(null);
              setGroup(null);
              setMessage("");
              setPlan(null);
            }}
            disabled={busy}
          >
            {label}
          </button>
        ))}
      </nav>
      <p className="form-message" role="status">
        {busy ? "Procesando…" : message}
      </p>
      <fieldset
        className="manager-controls"
        disabled={busy}
        aria-label="Edición del catálogo"
      >
        {tab === "products" && !draft && (
          <>
            <div className="manager-toolbar">
              <h2>Productos y variantes</h2>
              <button
                type="button"
                className="button button-gold"
                onClick={newProduct}
              >
                Nuevo producto
              </button>
            </div>
            <div className="manager-table-wrap">
            <table className="manager-table products-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Estado</th>
                    <th>Variantes</th>
                    <th>Stock total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {product.name}
                        <small>
                          {
                            catalog.brands.find(
                              (item) => item.id === product.brandId,
                            )?.name
                          }
                        </small>
                      </td>
                      <td>{product.active ? "Visible" : "Oculto"}</td>
                      <td>{product.variants.length}</td>
                      <td>
                        {product.variants.reduce(
                          (sum, item) => sum + item.stock,
                          0,
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => {
                            setDraft(structuredClone(product));
                            setMessage("");
                          }}
                        >
                          Editar {product.name}
                        </button>
                        <button
                          type="button"
                          className="text-link"
                          disabled={busy}
                          onClick={() =>
                            save({
                              ...catalog,
                              products: catalog.products.map((item) =>
                                item.id === product.id
                                  ? { ...item, active: !item.active }
                                  : item,
                              ),
                            })
                          }
                        >
                          {product.active ? "Ocultar" : "Publicar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!catalog.products.length && (
              <p>
                Todavía no hay productos. Cargá el primero o importá un archivo.
              </p>
            )}
          </>
        )}
        {tab === "products" && !draft && (
          <section className="inventory-summary">
            <h3>Inventario por SKU</h3>
            <form
              className="inventory-threshold"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                await save({
                  ...catalog,
                  lowStockThreshold: Number(form.get("threshold")),
                });
              }}
            >
              <label>
                Umbral de stock bajo
                <input
                  name="threshold"
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  required
                  defaultValue={catalog.lowStockThreshold ?? 0}
                  key={catalog.lowStockThreshold ?? 0}
                  disabled={busy}
                />
              </label>
              <button className="button button-outline" disabled={busy}>
                Guardar umbral
              </button>
            </form>
            <p>
              Variantes visibles con stock igual o menor a{" "}
              {catalog.lowStockThreshold ?? 0}. Ajustá existencias desde la
              edición de cada producto.
            </p>
            {lowStock.length ? (
              <ul className="low-stock-list">
                {lowStock.map(({ product, variant }) => (
                  <li key={variant.id}>
                    {product.name} · {variant.sku} ·{" "}
                    {variant.stock === 0
                      ? "Sin stock"
                      : variant.stock + " unidades"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay variantes visibles con stock bajo.</p>
            )}
          </section>
        )}
        {draft && (
          <form
            className="catalog-editor"
            onSubmit={submitProduct}
            key={draft.id}
          >
            <div className="manager-toolbar">
              <h2>
                {catalog.products.some((item) => item.id === draft.id)
                  ? "Editar producto"
                  : "Nuevo producto"}
              </h2>
              <button
                type="button"
                className="text-link"
                disabled={busy}
                onClick={() => setDraft(null)}
              >
                Cancelar edición
              </button>
            </div>
            <fieldset disabled={busy} className="editor-fields">
              <legend>Información del producto</legend>
              <label>
                Nombre
                <input
                  required
                  maxLength={140}
                  value={draft.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setDraft({
                      ...draft,
                      name,
                      slug: catalog.products.some(
                        (item) => item.id === draft.id,
                      )
                        ? draft.slug
                        : slugify(name),
                    });
                  }}
                />
              </label>
              <label>
                URL del producto
                <input
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={160}
                  value={draft.slug}
                  onChange={(event) => updateDraft("slug", event.target.value)}
                />
              </label>
              <label>
                Marca
                <select
                  aria-label="Marca"
                  value={draft.brandId}
                  onChange={(event) =>
                    updateDraft("brandId", event.target.value)
                  }
                >
                  {catalog.brands.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {!item.active ? " (oculta)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span>Categorías</span>
                <div className="editor-checkboxes">
                  {catalog.categories.map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={draft.categoryIds.includes(item.id)}
                        onChange={(event) =>
                          updateDraft(
                            "categoryIds",
                            event.target.checked
                              ? [...draft.categoryIds, item.id]
                              : draft.categoryIds.filter(
                                  (id) => id !== item.id,
                                ),
                          )
                        }
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="editor-wide">
                Descripción
                <textarea
                  maxLength={10000}
                  rows={4}
                  value={draft.description}
                  onChange={(event) =>
                    updateDraft("description", event.target.value)
                  }
                />
              </label>
              <label>
                Palabras clave (separadas por coma)
                <input
                  value={draft.tags.join(", ")}
                  onChange={(event) =>
                    updateDraft(
                      "tags",
                      event.target.value.split(",").map((item) => item.trim()),
                    )
                  }
                />
              </label>
              <div className="editor-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) =>
                      updateDraft("active", event.target.checked)
                    }
                  />
                  Visible en la tienda
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.featured}
                    onChange={(event) =>
                      updateDraft("featured", event.target.checked)
                    }
                  />
                  Destacado
                </label>
              </div>
              <label>
                Título SEO
                <input
                  maxLength={140}
                  value={draft.seoTitle}
                  onChange={(event) =>
                    updateDraft("seoTitle", event.target.value)
                  }
                />
              </label>
              <label>
                Descripción SEO
                <textarea
                  maxLength={320}
                  value={draft.seoDescription}
                  onChange={(event) =>
                    updateDraft("seoDescription", event.target.value)
                  }
                />
              </label>
            </fieldset>
            <h3>Variantes</h3>
            {draft.variants.map((variant, index) => (
              <fieldset
                key={variant.id}
                className="editor-fields variant-editor"
                disabled={busy}
              >
                <legend>Variante {index + 1}</legend>
                {(
                  [
                    ["sku", "SKU"],
                    ["flavor", "Sabor"],
                    ["size", "Tamaño"],
                    ["presentation", "Presentación"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      required={key === "sku"}
                      maxLength={key === "sku" ? 64 : 100}
                      value={variant[key]}
                      onChange={(event) =>
                        updateDraft(
                          "variants",
                          draft.variants.map((item) =>
                            item.id === variant.id
                              ? {
                                  ...item,
                                  [key]:
                                    key === "sku"
                                      ? event.target.value.toUpperCase()
                                      : event.target.value,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <label>
                  Precio de lista (ARS)
                  <input
                    name={`list-${variant.id}`}
                    required
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,2})?"
                    defaultValue={(variant.listPrice / 100).toFixed(2)}
                  />
                </label>
                <label>
                  Precio efectivo/transferencia (ARS)
                  <input
                    name={`cash-${variant.id}`}
                    required
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,2})?"
                    defaultValue={(variant.cashPrice / 100).toFixed(2)}
                  />
                </label>
                <label>
                  Stock
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    required
                    value={variant.stock}
                    onChange={(event) =>
                      updateDraft(
                        "variants",
                        draft.variants.map((item) =>
                          item.id === variant.id
                            ? { ...item, stock: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="editor-check">
                  <input
                    type="checkbox"
                    checked={variant.active}
                    onChange={(event) =>
                      updateDraft(
                        "variants",
                        draft.variants.map((item) =>
                          item.id === variant.id
                            ? { ...item, active: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  Variante visible
                </label>
              </fieldset>
            ))}
            <button
              type="button"
              className="button button-outline"
              disabled={busy || draft.variants.length >= 100}
              onClick={() =>
                updateDraft("variants", [...draft.variants, newVariant()])
              }
            >
              Agregar variante
            </button>
            <fieldset disabled={busy} className="editor-fields">
              <legend>Imágenes (hasta 12)</legend>
              <label>
                Subir imágenes
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    addImages(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              <p>
                JPEG, PNG o WebP. Definí el texto descriptivo y la variante; la
                primera imagen será la portada.
              </p>
              {draft.images.map((image, index) => (
                <div className="image-editor editor-wide" key={image.id}>
                  {(imageBase || imageUrls[image.path]) && (
                    <img
                      src={
                        imageUrls[image.path] || `${imageBase}/${image.path}`
                      }
                      alt=""
                      width={96}
                      height={96}
                    />
                  )}
                  <label>
                    Descripción de imagen {index + 1}
                    <input
                      required
                      maxLength={200}
                      value={image.alt}
                      onChange={(event) =>
                        updateDraft(
                          "images",
                          draft.images.map((item) =>
                            item.id === image.id
                              ? { ...item, alt: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Imagen de
                    <select
                      aria-label="Imagen de"
                      value={image.variantId ?? ""}
                      onChange={(event) =>
                        updateDraft(
                          "images",
                          draft.images.map((item) =>
                            item.id === image.id
                              ? {
                                  ...item,
                                  variantId: event.target.value || null,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Todo el producto</option>
                      {draft.variants.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.sku || "Nueva variante"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="text-link"
                    disabled={index === 0}
                    onClick={() => {
                      const images = [...draft.images];
                      [images[index - 1], images[index]] = [
                        images[index],
                        images[index - 1],
                      ];
                      updateDraft(
                        "images",
                        images.map((item, position) => ({ ...item, position })),
                      );
                    }}
                  >
                    Usar primero
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      updateDraft(
                        "images",
                        draft.images
                          .filter((item) => item.id !== image.id)
                          .map((item, position) => ({ ...item, position })),
                      )
                    }
                  >
                    Quitar imagen
                  </button>
                </div>
              ))}
            </fieldset>
            <button className="button button-gold" disabled={busy}>
              Guardar producto
            </button>
          </form>
        )}
        {(tab === "brands" || tab === "categories") && (
          <>
            <div className="manager-toolbar">
              <h2>{tab === "brands" ? "Marcas" : "Categorías"}</h2>
              <button
                type="button"
                className="button button-gold"
                onClick={() =>
                  setGroup({
                    id: crypto.randomUUID(),
                    name: "",
                    slug: "",
                    active: true,
                    sortOrder: groups.length,
                  })
                }
              >
                {tab === "brands" ? "Nueva marca" : "Nueva categoría"}
              </button>
            </div>
            {group && (
              <form
                className="editor-fields"
                key={group.id}
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const nextGroup = {
                    ...group,
                    name: String(form.get("name")).trim(),
                    slug: String(form.get("slug")).trim(),
                    active: form.has("active"),
                    sortOrder: Number(form.get("sortOrder")),
                    detail: String(form.get("detail") ?? ""),
                  };
                  const key = tab === "brands" ? "brands" : "categories";
                  if (
                    await save({
                      ...catalog,
                      [key]: groups.some((item) => item.id === group.id)
                        ? groups.map((item) =>
                            item.id === group.id ? nextGroup : item,
                          )
                        : [...groups, nextGroup],
                    })
                  )
                    setGroup(null);
                }}
              >
                <label>
                  Nombre
                  <input
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={group.name}
                  />
                </label>
                <label>
                  URL
                  <input
                    name="slug"
                    required
                    maxLength={100}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    defaultValue={group.slug}
                  />
                </label>
                <label>
                  Orden
                  <input
                    name="sortOrder"
                    type="number"
                    min={0}
                    max={10000}
                    defaultValue={group.sortOrder}
                    required
                  />
                </label>
                {tab === "categories" && (
                  <label>
                    Descripción breve
                    <input
                      name="detail"
                      maxLength={200}
                      defaultValue={group.detail}
                    />
                  </label>
                )}
                {tab === "brands" && (
                  <div className="image-editor editor-wide">
                    <label>
                      Logo de la marca (opcional)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={busy}
                        onChange={(event) => {
                          addBrandLogo(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {group.logo && (
                      <>
                        {(imageBase || imageUrls[group.logo]) && (
                          <img
                            src={
                              imageUrls[group.logo] ||
                              imageBase + "/" + group.logo
                            }
                            alt={"Logo de " + group.name}
                            width={96}
                            height={96}
                          />
                        )}
                        <button
                          type="button"
                          className="text-link"
                          disabled={busy}
                          onClick={() =>
                            setGroup({ ...group, logo: undefined })
                          }
                        >
                          Quitar logo
                        </button>
                      </>
                    )}
                  </div>
                )}
                <label className="editor-check">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={group.active}
                  />
                  Visible
                </label>
                <button className="button button-gold" disabled={busy}>
                  Guardar {tab === "brands" ? "marca" : "categoría"}
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setGroup(null)}
                >
                  Cancelar
                </button>
              </form>
            )}
            <div className="manager-table-wrap">
              <table className="manager-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>URL</th>
                    <th>Estado</th>
                    <th>Orden</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...groups]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.slug}</td>
                        <td>{item.active ? "Visible" : "Oculta"}</td>
                        <td>{item.sortOrder}</td>
                        <td>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => setGroup(item)}
                          >
                            Editar {item.name}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === "import" && (
          <div className="import-panel">
            <h2>Carga masiva con vista previa</h2>
            <p>
              CSV o Excel .xlsx, hasta 2 MB y 1000 filas. Los SKU identifican
              las variantes. Se conservan fotos y variantes que no estén en el
              archivo.
            </p>
            <a
              download="stylo-catalogo.csv"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(importColumns.join(";"))}`}
              className="button button-outline"
            >
              Descargar plantilla CSV
            </a>
            <label>
              Archivo de catálogo
              <input
                type="file"
                accept=".csv,.xlsx"
                disabled={busy}
                onChange={(event) => prepare(event.target.files?.[0])}
              />
            </label>
            {plan && (
              <>
                <h3>Informe de {fileName}</h3>
                <p>
                  {plan.rows} filas · {plan.created} variantes nuevas ·{" "}
                  {plan.updated} actualizaciones
                </p>
                {plan.errors.length ? (
                  <div role="alert">
                    <p>No se puede aplicar el lote:</p>
                    <ul>
                      {plan.errors.slice(0, 100).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className="manager-table-wrap">
                      <table className="manager-table import-table">
                        <thead>
                          <tr>
                            <th>Producto y variante</th>
                            <th>SKU</th>
                            <th>Precio de lista</th>
                            <th>Efectivo / transferencia</th>
                            <th>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.changes.map(({ product, before, after }) => (
                            <tr key={after.id}>
                              <td>
                                {product.name}
                                <small>
                                  {variantLabel(after)} ·{" "}
                                  {product.active ? "Visible" : "Oculto"}
                                </small>
                                <small>URL: {product.slug}</small>
                                <small>
                                  Marca:{" "}
                                  {
                                    catalog.brands.find(
                                      (item) => item.id === product.brandId,
                                    )?.name
                                  }
                                </small>
                                <small>
                                  Categorías:{" "}
                                  {product.categoryIds
                                    .map(
                                      (id) =>
                                        catalog.categories.find(
                                          (item) => item.id === id,
                                        )?.name,
                                    )
                                    .join(", ")}
                                </small>
                                <details>
                                  <summary>Descripción resultante</summary>
                                  <p>
                                    {product.description || "Sin descripción"}
                                  </p>
                                </details>
                              </td>
                              <td>
                                {after.sku}
                                <small>{before ? "Actualizar" : "Crear"}</small>
                              </td>
                              <td>
                                {before && (
                                  <small>
                                    Antes: {formatPrice(before.listPrice)}
                                  </small>
                                )}
                                {formatPrice(after.listPrice)}
                              </td>
                              <td>
                                {before && (
                                  <small>
                                    Antes: {formatPrice(before.cashPrice)}
                                  </small>
                                )}
                                {formatPrice(after.cashPrice)}
                              </td>
                              <td>
                                {before && <small>Antes: {before.stock}</small>}
                                {after.stock}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p>
                      Revisá los cambios antes de aplicar. El guardado del lote
                      es completo: si falla, no se aplica ninguna fila.
                    </p>
                  </>
                )}
                <button
                  type="button"
                  className="button button-gold"
                  disabled={
                    busy ||
                    plan.errors.length > 0 ||
                    catalog.revision !== plan.catalog.revision
                  }
                  onClick={async () => {
                    if (await save(plan.catalog)) setPlan(null);
                  }}
                >
                  Aplicar importación
                </button>
                <button
                  type="button"
                  className="text-link"
                  disabled={busy}
                  onClick={() => setPlan(null)}
                >
                  Descartar importación
                </button>
              </>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}
