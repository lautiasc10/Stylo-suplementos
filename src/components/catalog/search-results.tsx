import Link from "next/link";
import Form from "next/form";
import { ProductCard } from "./product-card";
import { Icon } from "@/components/ui/icon";
import {
  parseMoney,
  publicCatalog,
  type Catalog,
} from "@/modules/catalog/model";
import {
  createSearchIndex,
  POPULAR_SEARCHES,
  prepareSearch,
} from "@/modules/catalog/search";

export type SearchParams = Record<string, string | undefined>;
const PAGE_SIZE = 12;
export function SearchResults({
  catalog,
  params,
  imageBase = "",
  imageUrls = {},
  preview = false,
  error = false,
}: {
  catalog: Catalog;
  params: SearchParams;
  imageBase?: string;
  imageUrls?: Record<string, string>;
  preview?: boolean;
  error?: boolean;
}) {
  const data = publicCatalog(catalog),
    index = createSearchIndex(data, imageBase, imageUrls);
  const q = (params.q ?? "").trim().slice(0, 100),
    target = preview ? "/vista-previa/buscar" : "/buscar",
    shop = preview ? "/vista-previa" : "/catalogo";
  const hasDates = index.products.some((p) => p.createdAt);
  const requestedOrder = [
    "relevance",
    "price-asc",
    "price-desc",
    "newest",
  ].includes(params.orden ?? "")
    ? params.orden!
    : "relevance";
  const order =
    requestedOrder === "newest" && !hasDates ? "relevance" : requestedOrder;
  let min: number | undefined,
    max: number | undefined,
    invalidPrice = false;
  try {
    if (params.min) min = parseMoney(params.min);
    if (params.max) max = parseMoney(params.max);
    if (min !== undefined && max !== undefined && min > max)
      invalidPrice = true;
  } catch {
    invalidPrice = true;
  }
  const rows = invalidPrice
    ? []
    : prepareSearch(index)(q, {
        category: params.categoria,
        brand: params.marca,
        min,
        max,
        stock: params.stock === "1",
        sort: order,
      }).products;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(
    pages,
    Math.max(1, Math.floor(Number(params.pagina) || 1)),
  );
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function url(changes: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    for (const key of [
      "q",
      "categoria",
      "marca",
      "min",
      "max",
      "stock",
      "orden",
      "pagina",
    ])
      if (params[key]) search.set(key, params[key]!);
    for (const [key, value] of Object.entries(changes))
      value ? search.set(key, value) : search.delete(key);
    if (!("pagina" in changes)) search.delete("pagina");
    return `${target}${search.size ? `?${search}` : ""}`;
  }
  const chips = [
    params.categoria
      ? {
          key: "categoria",
          text:
            index.categories.find((c) => c.slug === params.categoria)?.name ??
            "Categoría seleccionada",
        }
      : null,
    params.marca
      ? {
          key: "marca",
          text:
            index.brands.find((b) => b.slug === params.marca)?.name ??
            "Marca seleccionada",
        }
      : null,
    params.min ? { key: "min", text: `Desde $ ${params.min}` } : null,
    params.max ? { key: "max", text: `Hasta $ ${params.max}` } : null,
    params.stock === "1" ? { key: "stock", text: "Solo con stock" } : null,
  ].filter((c): c is { key: string; text: string } => !!c);
  return (
    <section
      className="container search-page"
      aria-labelledby="search-page-title"
    >
      <div className="search-page-heading">
        <p className="eyebrow">ENCONTRÁ TU STYLO</p>
        <h1 id="search-page-title">
          {q ? (
            <>
              Resultados para <span>«{q}»</span>
            </>
          ) : (
            "Buscá tu próxima elección"
          )}
        </h1>
        <Form action={target} className="search-page-query" role="search">
          <label className="sr-only" htmlFor="results-query">
            Buscar productos
          </label>
          <Icon name="search" />
          <input
            id="results-query"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Producto, marca, categoría o sabor"
            maxLength={100}
          />
          <button className="button button-gold">Buscar</button>
        </Form>
      </div>
      {preview && (
        <p className="preview-notice">
          Vista previa local · Productos, marcas, precios y existencias de
          prueba.
        </p>
      )}
      <Form
        action={target}
        key={JSON.stringify(params)}
        className="search-filter-bar"
        aria-label="Filtrar resultados"
      >
        {q && <input type="hidden" name="q" value={q} />}
        <label>
          Categoría
          <select
            aria-label="Categoría"
            name="categoria"
            defaultValue={params.categoria ?? ""}
          >
            <option value="">Todas las categorías</option>
            {index.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Marca
          <select
            aria-label="Marca"
            name="marca"
            defaultValue={params.marca ?? ""}
          >
            <option value="">Todas las marcas</option>
            {index.brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="search-price-filter">
          <legend>Precio de lista</legend>
          <label>
            <span className="sr-only">Precio mínimo</span>
            <input
              name="min"
              type="number"
              min="0"
              step="1"
              defaultValue={params.min ?? ""}
              placeholder="Desde"
            />
          </label>
          <span aria-hidden="true">—</span>
          <label>
            <span className="sr-only">Precio máximo</span>
            <input
              name="max"
              type="number"
              min="0"
              step="1"
              defaultValue={params.max ?? ""}
              placeholder="Hasta"
            />
          </label>
        </fieldset>
        <label className="search-stock-filter">
          <input
            name="stock"
            type="checkbox"
            value="1"
            defaultChecked={params.stock === "1"}
          />
          Solo con stock
        </label>
        <label>
          Ordenar por
          <select aria-label="Ordenar por" name="orden" defaultValue={order}>
            <option value="relevance">Relevancia</option>
            <option value="price-asc">Menor precio</option>
            <option value="price-desc">Mayor precio</option>
            <option value="newest" disabled={!hasDates}>
              {hasDates ? "Más nuevos" : "Más nuevos · próximamente"}
            </option>
          </select>
        </label>
        <button className="button button-outline" type="submit">
          Aplicar filtros
        </button>
      </Form>
      {requestedOrder === "newest" && !hasDates && (
        <p className="ui-notice" role="status">
          Todavía no tenemos fechas de incorporación para ordenar por novedades.
          Mostramos los resultados por relevancia.
        </p>
      )}
      <div className="search-results-toolbar">
        <p role="status">
          {rows.length}{" "}
          {rows.length === 1 ? "producto encontrado" : "productos encontrados"}
          {rows.length > PAGE_SIZE ? ` · Página ${page} de ${pages}` : ""}
        </p>
        {chips.length > 0 && (
          <div className="search-active-filters">
            {chips.map((chip) => (
              <Link
                key={chip.key}
                href={url({ [chip.key]: undefined })}
                aria-label={`Quitar filtro ${chip.text}`}
              >
                {chip.text}
                <Icon name="close" />
              </Link>
            ))}
            <Link
              href={`${target}${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className="search-clear-filters"
            >
              Limpiar filtros
            </Link>
          </div>
        )}
      </div>
      {error ? (
        <div className="search-results-empty" role="alert">
          <h2>No pudimos cargar los productos</h2>
          <p>Intentá nuevamente en unos momentos.</p>
          <Link className="button button-outline" href={target}>
            Reintentar búsqueda
          </Link>
        </div>
      ) : visible.length ? (
        <div className="product-grid search-product-grid">
          {visible.map(({ product: hit, variant, variants }, i) => {
            const product = data.products.find((p) => p.id === hit.id)!,
              ids = new Set(variants.map((v) => v.id));
            return (
              <ProductCard
                key={`${product.id}:${JSON.stringify(params)}`}
                product={product}
                variants={product.variants.filter((v) => ids.has(v.id))}
                initialVariantId={variant.id}
                brand={data.brands.find((b) => b.id === product.brandId)!}
                category={data.categories.find((c) =>
                  product.categoryIds.includes(c.id),
                )}
                index={i}
                productPrefix={preview ? "/vista-previa/producto" : "/producto"}
                imageBase={imageBase}
                imageUrls={imageUrls}
                preview={preview}
              />
            );
          })}
        </div>
      ) : (
        <div className="search-results-empty">
          <h2>
            {invalidPrice
              ? "Revisá el rango de precios"
              : q
                ? `No encontramos «${q}»`
                : "No encontramos productos con estos filtros"}
          </h2>
          <p>
            {invalidPrice
              ? "El precio mínimo debe ser menor o igual al máximo."
              : "Probá con otro nombre, una marca o menos filtros."}
          </p>
          <div className="search-chips">
            {POPULAR_SEARCHES.map((term) => (
              <Link key={term} href={`${target}?q=${encodeURIComponent(term)}`}>
                {term}
              </Link>
            ))}
          </div>
          <Link className="button button-outline" href={shop}>
            Explorar la tienda completa <Icon name="arrow" />
          </Link>
        </div>
      )}
      {pages > 1 && (
        <nav className="search-pagination" aria-label="Páginas de resultados">
          {page > 1 ? (
            <Link href={url({ pagina: String(page - 1) })} rel="prev">
              <Icon name="back" />
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link href={url({ pagina: String(page + 1) })} rel="next">
              Siguiente
              <Icon name="arrow" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
