import Link from "next/link";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import {
  filterCatalog,
  formatPrice,
  publicCatalog,
  type Catalog,
  type CatalogFilters,
} from "@/modules/catalog/model";

export function CatalogListing({
  catalog,
  filters,
  action = "/catalogo",
  productPrefix = "/producto",
  imageBase = "",
  imageUrls = {},
  preview = false,
}: {
  catalog: Catalog;
  filters: CatalogFilters;
  action?: string;
  productPrefix?: string;
  imageBase?: string;
  imageUrls?: Record<string, string>;
  preview?: boolean;
}) {
  const data = publicCatalog(catalog),
    results = filterCatalog(data, filters);
  const flavors = [
    ...new Set(
      data.products
        .flatMap((product) => product.variants.map((variant) => variant.flavor))
        .filter(Boolean),
    ),
  ].sort();
  return (
    <>
      <form action={action} method="get" className="catalog-filters">
        <div className="catalog-search">
          <label htmlFor="catalog-search">Buscá por producto o marca</label>
          <input
            id="catalog-search"
            name="q"
            type="search"
            defaultValue={filters.q}
            list="catalog-suggestions"
            maxLength={100}
            placeholder="¿Qué estás buscando?"
            autoComplete="off"
          />
          <datalist id="catalog-suggestions">
            {[
              ...data.products.map((product) => product.name),
              ...data.brands.map((brand) => brand.name),
            ]
              .slice(0, 30)
              .map((name) => (
                <option key={name} value={name} />
              ))}
          </datalist>
        </div>
        <label>
          Categoría
          <select
            aria-label="Categoría"
            name="categoria"
            defaultValue={filters.category ?? ""}
          >
            <option value="">Todas</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Marca
          <select
            aria-label="Marca"
            name="marca"
            defaultValue={filters.brand ?? ""}
          >
            <option value="">Todas</option>
            {data.brands.map((brand) => (
              <option key={brand.id} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sabor
          <select
            aria-label="Sabor"
            name="sabor"
            defaultValue={filters.flavor ?? ""}
          >
            <option value="">Todos</option>
            {flavors.map((flavor) => (
              <option key={flavor}>{flavor}</option>
            ))}
          </select>
        </label>
        <label>
          Disponibilidad
          <select
            aria-label="Disponibilidad"
            name="disponibilidad"
            defaultValue={filters.availability ?? ""}
          >
            <option value="">Todas</option>
            <option value="in-stock">Con stock</option>
            <option value="out-of-stock">Sin stock</option>
          </select>
        </label>
        <label>
          Desde (ARS)
          <input
            name="min"
            inputMode="decimal"
            defaultValue={filters.min}
            placeholder="Sin mínimo"
            pattern="[0-9]+([.,][0-9]{1,2})?"
          />
        </label>
        <label>
          Hasta (ARS)
          <input
            name="max"
            inputMode="decimal"
            defaultValue={filters.max}
            placeholder="Sin máximo"
            pattern="[0-9]+([.,][0-9]{1,2})?"
          />
        </label>
        <label>
          Ordenar
          <select
            aria-label="Ordenar"
            name="orden"
            defaultValue={filters.sort ?? "name"}
          >
            <option value="name">Nombre</option>
            <option value="price-asc">Menor precio de lista</option>
            <option value="price-desc">Mayor precio de lista</option>
          </select>
        </label>
        <button className="button button-gold">Aplicar filtros</button>
        <Link href={action} className="text-link">
          Limpiar filtros
        </Link>
      </form>
      <div className="catalog-results-heading">
        <p role="status">
          {results.length} {results.length === 1 ? "producto" : "productos"}
        </p>
        <p>Filtro y orden por precio de lista.</p>
      </div>
      {results.length ? (
        <div className="product-grid">
          {results.map(({ product, variant, brand }) => {
            const category = data.categories.find((item) =>
              product.categoryIds.includes(item.id),
            );
            const photo =
              product.images.find((image) => image.variantId === variant.id) ??
              product.images.find((image) => image.variantId === null);
            const href = `${productPrefix}/${product.slug}?variante=${variant.id}`;
            return (
              <article className="product-card" key={product.id}>
                <Link
                  className="product-card-media"
                  href={href}
                  aria-label={`Ver ${product.name}`}
                >
                  {photo && (imageBase || imageUrls[photo.path]) ? (
                    <img
                      src={
                        imageUrls[photo.path] || `${imageBase}/${photo.path}`
                      }
                      alt={photo.alt}
                      width={480}
                      height={480}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="product-placeholder">
                      <CategoryIllustration
                        kind={category?.slug ?? "proteinas"}
                      />
                      <span>
                        {preview
                          ? "Ilustración · datos de prueba"
                          : "Imagen pendiente"}
                      </span>
                    </div>
                  )}
                </Link>
                <div className="product-card-copy">
                  <p className="product-brand">
                    {brand.logo && (imageBase || imageUrls[brand.logo]) && (
                      <img
                        src={
                          imageUrls[brand.logo] || `${imageBase}/${brand.logo}`
                        }
                        alt=""
                        width={64}
                        height={32}
                        loading="lazy"
                      />
                    )}
                    {brand.name}
                  </p>
                  <h2>
                    <Link href={href}>{product.name}</Link>
                  </h2>
                  <p
                    className="stock-badge"
                    data-stock={variant.stock > 0 ? "available" : "empty"}
                  >
                    {variant.stock > 0 ? "Disponible" : "Sin stock"}
                  </p>
                  <dl className="product-prices">
                    <div>
                      <dt>Precio de lista</dt>
                      <dd>{formatPrice(variant.listPrice)}</dd>
                    </div>
                    <div>
                      <dt>Efectivo / transferencia</dt>
                      <dd>{formatPrice(variant.cashPrice)}</dd>
                    </div>
                  </dl>
                  <Link href={href} className="button button-outline">
                    Ver variantes
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>
            {data.products.length
              ? "No encontramos coincidencias."
              : "Tu próxima elección empieza acá."}
          </h2>
          <p>
            {data.products.length
              ? "Probá con otros filtros o palabras de búsqueda."
              : "Estamos preparando nuestra selección de productos."}
          </p>
          <Link
            href={data.products.length ? action : "/"}
            className="button button-outline"
          >
            {data.products.length ? "Ver todo el catálogo" : "Volver al inicio"}
          </Link>
        </div>
      )}
    </>
  );
}
