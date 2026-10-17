"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { catalogSection } from "./section-navigation";
import { ProductThumbnail } from "@/components/ui/product-thumbnail";
import { Icon } from "@/components/ui/icon";
import { IconAction } from "@/components/admin/icon-action";
import { AdminTable } from "@/components/admin/data-table";
import { ProductImagesEditor } from "./product-images-editor";
import { normalizeSearch } from "@/modules/catalog/search";
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
  variantImages,
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
  const params = useSearchParams();
  const tab = catalogSection(params.get("seccion"));
  const messageRef = useRef<HTMLParagraphElement>(null);
  const productEditor = useRef<HTMLFormElement>(null);
  const productTriggerId = useRef("new-product");
  const [draft, setDraft] = useState<Product | null>(null),
    [plan, setPlan] = useState<ImportPlan | null>(null);
  const [approvedCategories, setApprovedCategories] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [group, setGroup] = useState<CatalogGroup | null>(null),
    [fileName, setFileName] = useState("");
  const draftId = draft?.id;
  const groupId = group?.id;
  const groupEditor = useRef<HTMLFormElement>(null);
  const groupTrigger = useRef<HTMLButtonElement>(null);
  function closeProductEditor(productId?: string) {
    const triggerId = productId
      ? `edit-product-${productId}`
      : productTriggerId.current;
    setDraft(null);
    requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  }
  useEffect(() => {
    if (draftId)
      productEditor.current
        ?.querySelector<HTMLInputElement>('input[name="name"]')
        ?.focus();
  }, [draftId]);
  function closeGroupEditor() {
    const triggerId = groupTrigger.current?.id;
    setGroup(null);
    requestAnimationFrame(
      () => triggerId && document.getElementById(triggerId)?.focus(),
    );
  }
  useEffect(() => {
    if (groupId)
      groupEditor.current
        ?.querySelector<HTMLInputElement>('input[name="name"]')
        ?.focus();
  }, [groupId]);
  const currentTab = useRef(tab);
  useEffect(() => {
    if (tab !== currentTab.current) {
      currentTab.current = tab;
      setDraft(null);
      setGroup(null);
      setMessage("");
      setPlan(null);
      setApprovedCategories([]);
      setFileName("");
    }
  }, [tab]);
  useEffect(() => {
    if (message && message !== "Cambios guardados." && !busy)
      messageRef.current?.focus();
  }, [message, busy]);
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
    productTriggerId.current = "new-product";
    setMessage("");
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
      if (await save(next)) closeProductEditor(product.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Revisá los precios.",
      );
    }
  }
  async function addImages(
    files: FileList | null,
    variantId: string | null = null,
    field: "images" | "informationImages" | "turnImages" = "images",
  ) {
    if (!files?.length || !draft || busy) return;
    const currentImages = draft[field] ?? [];
    if (
      currentImages.length + files.length >
      (field === "turnImages" ? 24 : 12)
    ) {
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
          alt:
            field === "informationImages"
              ? `Ficha del fabricante · ${draft.name}`.slice(0, 200)
              : draft.name || "Imagen del producto",
          variantId,
          position: currentImages.length + images.length,
          ...(field === "turnImages" && { view: "back" as const }),
        });
      }
      updateDraft(field, [...currentImages, ...images]);
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
  async function replaceImage(
    imageId: string,
    file?: File,
    field: "images" | "informationImages" | "turnImages" = "images",
  ) {
    if (!file || !draft || busy) return;
    const productId = draft.id;
    setBusy(true);
    setMessage("");
    try {
      const result = await upload(file, productId);
      if (result.error || !result.path)
        throw new Error(result.error || "No pudimos reemplazar la imagen.");
      setDraft((previous) =>
        previous?.id === productId
          ? {
              ...previous,
              [field]: (previous[field] ?? []).map((image) =>
                image.id === imageId ? { ...image, path: result.path! } : image,
              ),
            }
          : previous,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No pudimos reemplazar la imagen. La foto anterior se conserva.",
      );
    } finally {
      setBusy(false);
    }
  }
  function removeDraftVariant(variantId: string) {
    if (!draft || busy || draft.variants.length <= 1) return;
    // Persisted SKUs may belong to orders and promotions. Only discard variants
    // created in this editing session; existing ones retain their visibility control.
    if (
      catalog.products.some((product) =>
        product.variants.some((variant) => variant.id === variantId),
      )
    )
      return;
    setDraft({
      ...draft,
      variants: draft.variants.filter((variant) => variant.id !== variantId),
      images: draft.images.map((image) =>
        image.variantId === variantId ? { ...image, variantId: null } : image,
      ),
      ...(draft.turnImages && {
        turnImages: draft.turnImages.filter(
          (image) => image.variantId !== variantId,
        ),
      }),
      ...(draft.informationImages && {
        informationImages: draft.informationImages.filter(
          (image) => image.variantId !== variantId,
        ),
      }),
    });
    requestAnimationFrame(() =>
      document.getElementById("add-variant")?.focus(),
    );
  }
  async function prepare(file?: File) {
    setPlan(null);
    setApprovedCategories([]);
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
  const brandOrder = ["star nutrition", "one fit", "xbody"];
  const queryTerms = normalizeSearch(productQuery.trim())
    .split(/\s+/)
    .filter(Boolean);
  const productGroups = catalog.brands
    .map((brand) => ({
      brand,
      products: catalog.products
        .filter((product) => product.brandId === brand.id)
        .filter((product) => {
          const searchable = normalizeSearch(
            [
              product.name,
              product.slug,
              brand.name,
              ...product.variants.flatMap((variant) => [
                variant.sku,
                variant.flavor,
                variant.size,
                variant.presentation,
              ]),
            ].join(" "),
          );
          return queryTerms.every((term) => searchable.includes(term));
        })
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    }))
    .filter(({ products }) => products.length > 0)
    .sort((a, b) => {
      const rank = (name: string) => {
        const normalized = normalizeSearch(name)
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
        const index = brandOrder.indexOf(normalized);
        return index === -1 ? brandOrder.length : index;
      };
      return (
        rank(a.brand.name) - rank(b.brand.name) ||
        a.brand.name.localeCompare(b.brand.name, "es")
      );
    });
  const lowStock = publicCatalog(catalog).products.flatMap((product) =>
    product.variants
      .filter(
        (variant) =>
          variant.active && variant.stock <= (catalog.lowStockThreshold ?? 0),
      )
      .map((variant) => ({ product, variant })),
  );
  return (
    <div className="catalog-manager">
      <p className="form-message" role="status" ref={messageRef} tabIndex={-1}>
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
              <h2>Productos</h2>
              <button
                type="button"
                className="button button-gold"
                id="new-product"
                onClick={newProduct}
              >
                <Icon name="plus" /> Nuevo producto
              </button>
            </div>
            <div className="admin-product-search">
              <label htmlFor="admin-product-query">Buscar productos</label>
              <input
                id="admin-product-query"
                type="search"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Nombre, marca, sabor o SKU"
                autoComplete="off"
              />
              <span aria-live="polite">
                {productGroups.reduce(
                  (total, group) => total + group.products.length,
                  0,
                )}{" "}
                de {catalog.products.length} productos
              </span>
            </div>
            {productGroups.map(({ brand, products }) => (
              <section
                className="admin-product-brand"
                key={brand.id}
                aria-labelledby={`product-brand-${brand.id}`}
              >
                <div className="admin-product-brand-heading">
                  <h3 id={`product-brand-${brand.id}`}>{brand.name}</h3>
                  <span>
                    {products.length}{" "}
                    {products.length === 1 ? "producto" : "productos"}
                  </span>
                </div>
                <ul
                  className="admin-product-grid"
                  aria-label={`Productos de ${brand.name}`}
                >
                  {products.map((product) => {
                    const image =
                      variantImages(
                        product,
                        product.variants[0]?.id ?? "",
                      )[0] ??
                      [...product.images].sort(
                        (a, b) => a.position - b.position,
                      )[0];
                    const src = image
                      ? imageUrls[image.path] ||
                        (imageBase ? `${imageBase}/${image.path}` : undefined)
                      : undefined;
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          className="admin-product-card"
                          id={`edit-product-${product.id}`}
                          aria-label={`Editar ${product.name}`}
                          onClick={() => {
                            productTriggerId.current = `edit-product-${product.id}`;
                            setDraft(structuredClone(product));
                            setMessage("");
                          }}
                        >
                          <ProductThumbnail
                            src={src}
                            alt={`Foto de ${product.name}`}
                            size={320}
                          />
                          <span className="admin-product-name">
                            {product.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {catalog.products.length > 0 && productGroups.length === 0 && (
              <p className="management-empty" role="status">
                No encontramos productos con esa búsqueda.
              </p>
            )}
            {!catalog.products.length && (
              <p className="management-empty">
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
            ref={productEditor}
            className="catalog-editor admin-editor"
            onSubmit={submitProduct}
            onInvalid={(event) => {
              const field = event.target as HTMLInputElement;
              setMessage(
                `Revisá el campo ${field.closest("label")?.textContent?.trim() || "obligatorio"}.`,
              );
            }}
            key={draft.id}
          >
            <div className="manager-toolbar">
              <h2>
                {catalog.products.some((item) => item.id === draft.id)
                  ? "Editar producto"
                  : "Nuevo producto"}
              </h2>
              <div className="editor-header-actions">
                <button
                  type="button"
                  className="text-link"
                  disabled={busy}
                  onClick={() => closeProductEditor()}
                >
                  Volver al listado
                </button>
                <button className="button button-gold" disabled={busy}>
                  {busy ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
            <nav
              className="editor-jump-links"
              aria-label="Secciones del producto"
            >
              <a href="#editor-datos">Información</a>
              <a href="#editor-variantes">Variantes y precios</a>
              <a href="#editor-fotos">Fotografías</a>
              <a href="#editor-fichas">Fichas del fabricante</a>
            </nav>
            <fieldset
              disabled={busy}
              className="editor-fields"
              id="editor-datos"
            >
              <legend>Información del producto</legend>
              <label>
                Nombre
                <input
                  required
                  maxLength={140}
                  name="name"
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
              <details className="editor-seo">
                <summary>Opciones para buscadores (SEO)</summary>
                <div>
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
                </div>
              </details>
            </fieldset>
            <section id="editor-variantes">
              <div className="editor-section-heading">
                <h3>Variantes y precios</h3>
                <span className="status-badge">
                  {draft.variants.length}{" "}
                  {draft.variants.length === 1
                    ? "presentación"
                    : "presentaciones"}
                </span>
              </div>
              {draft.variants.map((variant, index) => (
                <fieldset
                  key={variant.id}
                  className="editor-fields variant-editor"
                  disabled={busy}
                >
                  <legend>Variante {index + 1}</legend>
                  {draft.variants.length > 1 &&
                    !catalog.products.some((product) =>
                      product.variants.some((item) => item.id === variant.id),
                    ) && (
                      <div className="variant-draft-action editor-wide">
                        <span>Nueva variante · sin guardar</span>
                        <IconAction
                          icon="trash"
                          label={`Descartar variante ${index + 1}`}
                          onClick={() => removeDraftVariant(variant.id)}
                        />
                      </div>
                    )}
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
                  <ProductImagesEditor
                    images={draft.images}
                    variants={draft.variants}
                    variantId={variant.id}
                    title={`Fotos · ${variant.flavor || variant.sku || `Variante ${index + 1}`}`}
                    uploadLabel={`Subir fotos de variante ${index + 1}`}
                    busy={busy}
                    imageBase={imageBase}
                    imageUrls={imageUrls}
                    onUpload={addImages}
                    onReplace={replaceImage}
                    onChange={(images) => updateDraft("images", images)}
                  />
                  <ProductImagesEditor
                    images={draft.turnImages ?? []}
                    variants={draft.variants}
                    variantId={variant.id}
                    purpose="turn"
                    title={`Costados y dorso · ${variant.flavor || variant.sku || `Variante ${index + 1}`}`}
                    uploadLabel={`Subir vistas de variante ${index + 1}`}
                    busy={busy}
                    imageBase={imageBase}
                    imageUrls={imageUrls}
                    onUpload={(files, variantId) =>
                      addImages(files, variantId, "turnImages")
                    }
                    onReplace={(id, file) =>
                      replaceImage(id, file, "turnImages")
                    }
                    onChange={(images) => updateDraft("turnImages", images)}
                  />
                </fieldset>
              ))}
              <button
                id="add-variant"
                type="button"
                className="button button-outline"
                disabled={busy || draft.variants.length >= 100}
                onClick={() =>
                  updateDraft("variants", [...draft.variants, newVariant()])
                }
              >
                Agregar variante
              </button>
            </section>
            <fieldset
              disabled={busy}
              className="editor-fields"
              id="editor-fotos"
            >
              <legend>Fotos compartidas (opcionales)</legend>
              <p className="editor-wide">
                Se usan en las variantes que no tienen fotos propias. JPEG, PNG
                o WebP; hasta 12 imágenes en total por producto.
              </p>
              <ProductImagesEditor
                images={draft.images}
                variants={draft.variants}
                variantId={null}
                title="Fotos para todas las variantes"
                uploadLabel="Subir imágenes"
                busy={busy}
                imageBase={imageBase}
                imageUrls={imageUrls}
                onUpload={addImages}
                onReplace={replaceImage}
                onChange={(images) => updateDraft("images", images)}
              />
              <ProductImagesEditor
                images={draft.turnImages ?? []}
                variants={draft.variants}
                variantId={null}
                purpose="turn"
                title="Costados y dorso compartidos"
                uploadLabel="Subir vistas compartidas del envase"
                busy={busy}
                imageBase={imageBase}
                imageUrls={imageUrls}
                onUpload={(files, variantId) =>
                  addImages(files, variantId, "turnImages")
                }
                onReplace={(id, file) => replaceImage(id, file, "turnImages")}
                onChange={(images) => updateDraft("turnImages", images)}
              />
            </fieldset>
            <fieldset
              disabled={busy}
              className="editor-fields"
              id="editor-fichas"
            >
              <legend>Fichas del fabricante (opcionales)</legend>
              <p className="editor-wide">
                Información nutricional, ingredientes o uso. Elegí «Todo el
                producto» para compartir una única ficha entre las variantes; si
                cambia la información, asociala al SKU correspondiente. Se
                muestran dentro de la ficha del producto.
              </p>
              <ProductImagesEditor
                images={draft.informationImages ?? []}
                variants={draft.variants}
                variantId={null}
                purpose="information"
                showAll
                title="Fichas informativas"
                uploadLabel="Subir fichas informativas"
                busy={busy}
                imageBase={imageBase}
                imageUrls={imageUrls}
                onUpload={(files, variantId) =>
                  addImages(files, variantId, "informationImages")
                }
                onReplace={(imageId, file) =>
                  replaceImage(imageId, file, "informationImages")
                }
                onChange={(images) => updateDraft("informationImages", images)}
              />
            </fieldset>
            <div className="editor-actions">
              <button
                type="button"
                className="button button-outline"
                disabled={busy}
                onClick={() => closeProductEditor()}
              >
                Cancelar edición
              </button>
              <button className="button button-gold" disabled={busy}>
                {busy ? "Guardando…" : "Guardar producto"}
              </button>
            </div>
          </form>
        )}
        {(tab === "brands" || tab === "categories") && (
          <>
            <div className="manager-toolbar">
              <h2>
                {group
                  ? (group.name ? "Editar" : "Crear") +
                    (tab === "brands" ? " marca" : " categoría")
                  : tab === "brands"
                    ? "Marcas"
                    : "Categorías"}
              </h2>
              {!group && (
                <button
                  type="button"
                  className="button button-gold"
                  id="group-create"
                  disabled={busy || Boolean(group)}
                  onClick={(event) => {
                    groupTrigger.current = event.currentTarget;
                    setGroup({
                      id: crypto.randomUUID(),
                      name: "",
                      slug: "",
                      active: true,
                      sortOrder: groups.length,
                    });
                  }}
                >
                  <Icon name="plus" />{" "}
                  {tab === "brands" ? "Nueva marca" : "Nueva categoría"}
                </button>
              )}
            </div>
            {group && (
              <form
                className="checkout-form admin-editor group-editor"
                ref={groupEditor}
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
                    closeGroupEditor();
                }}
              >
                <fieldset className="editor-fields" disabled={busy}>
                  <legend>
                    {tab === "brands"
                      ? "Información de la marca"
                      : "Información de la categoría"}
                  </legend>
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
                          <IconAction
                            type="button"
                            icon="trash"
                            label="Quitar logo"
                            disabled={busy}
                            onClick={() =>
                              setGroup({ ...group, logo: undefined })
                            }
                          />
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
                </fieldset>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={busy}
                    onClick={closeGroupEditor}
                  >
                    Cancelar
                  </button>
                  <button className="button button-gold" disabled={busy}>
                    Guardar {tab === "brands" ? "marca" : "categoría"}
                  </button>
                </div>
              </form>
            )}
            {!group &&
              (!groups.length ? (
                <p className="management-empty">
                  Todavía no hay {tab === "brands" ? "marcas" : "categorías"}.
                  Creá la primera para organizar el catálogo.
                </p>
              ) : (
                <AdminTable
                  className="groups-table"
                  label={
                    tab === "brands"
                      ? "Marcas del catálogo"
                      : "Categorías del catálogo"
                  }
                >
                  <thead>
                    <tr role="row">
                      <th scope="col">
                        {tab === "brands" ? "Marca" : "Categoría"}
                      </th>
                      <th scope="col">Estado</th>
                      <th scope="col">Orden</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...groups]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => (
                        <tr key={item.id} role="row">
                          <td role="cell">
                            <div className="group-identity">
                              {tab === "brands" &&
                                item.logo &&
                                (imageBase || imageUrls[item.logo]) && (
                                  <img
                                    className="group-logo"
                                    src={
                                      imageUrls[item.logo] ||
                                      imageBase + "/" + item.logo
                                    }
                                    alt=""
                                    width={48}
                                    height={48}
                                    loading="lazy"
                                  />
                                )}
                              <div>
                                <strong>{item.name}</strong>
                                <small>URL: {item.slug}</small>
                                {tab === "categories" && item.detail && (
                                  <small>{item.detail}</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td role="cell" data-label="Estado">
                            <span
                              className="status-badge"
                              data-active={item.active}
                            >
                              {item.active ? "Visible" : "Oculta"}
                            </span>
                          </td>
                          <td role="cell" data-label="Orden">
                            <span className="group-order">
                              {item.sortOrder}
                            </span>
                          </td>
                          <td role="cell">
                            <div className="admin-row-actions">
                              <IconAction
                                id={`group-edit-${item.id}`}
                                icon="edit"
                                label={`Editar ${item.name}`}
                                disabled={busy}
                                onClick={(event) => {
                                  groupTrigger.current = event.currentTarget;
                                  setGroup(item);
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </AdminTable>
              ))}
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
                {plan.changes.length > 0 &&
                  plan.changes.every(
                    ({ product, after }) =>
                      !product.active && after.stock === 0,
                  ) && (
                    <p>
                      Todos los productos de este archivo quedarán ocultos y sin
                      stock, según los valores del CSV.
                    </p>
                  )}
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
                    {plan.createdCategories.length > 0 && (
                      <div className="import-new-categories">
                        <h4>Categorías nuevas</h4>
                        <p>
                          Estos registros se crearán junto con los productos
                          solo si confirmás la importación:
                        </p>
                        {plan.createdCategories.map((category) => (
                          <label key={category.id}>
                            <input
                              type="checkbox"
                              checked={approvedCategories.includes(category.id)}
                              disabled={busy}
                              onChange={(event) =>
                                setApprovedCategories((previous) =>
                                  event.target.checked
                                    ? [...previous, category.id]
                                    : previous.filter(
                                        (id) => id !== category.id,
                                      ),
                                )
                              }
                            />
                            Confirmo crear «{category.name}» ({category.slug})
                          </label>
                        ))}
                      </div>
                    )}
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
                                    plan.catalog.brands.find(
                                      (item) => item.id === product.brandId,
                                    )?.name
                                  }
                                </small>
                                <small>
                                  Categorías:{" "}
                                  {product.categoryIds
                                    .map(
                                      (id) =>
                                        plan.catalog.categories.find(
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
                    plan.createdCategories.some(
                      (category) => !approvedCategories.includes(category.id),
                    ) ||
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
