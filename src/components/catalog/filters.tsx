import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type {
  Catalog,
  CatalogFilters,
  CatalogGroup,
} from "@/modules/catalog/model";

export function CatalogFilterBar({
  catalog,
  filters,
  action,
  categories = catalog.categories,
}: {
  catalog: Catalog;
  filters: CatalogFilters;
  action: string;
  categories?: Pick<CatalogGroup, "id" | "name" | "slug">[];
}) {
  const flavors = [
    ...new Set(
      catalog.products.flatMap((product) =>
        product.variants.map((variant) => variant.flavor).filter(Boolean),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  const parameters = {
    q: filters.q,
    categoria: filters.category,
    marca: filters.brand,
    sabor: filters.flavor,
    disponibilidad: filters.availability,
    min: filters.min,
    max: filters.max,
    orden: filters.sort,
  };
  const selections = [
    { key: "q", label: filters.q && `Búsqueda: ${filters.q}` },
    {
      key: "categoria",
      label: categories.find((item) => item.slug === filters.category)?.name,
    },
    {
      key: "marca",
      label: catalog.brands.find((item) => item.slug === filters.brand)?.name,
    },
    { key: "sabor", label: filters.flavor },
    {
      key: "disponibilidad",
      label:
        filters.availability === "in-stock"
          ? "Con stock"
          : filters.availability === "out-of-stock"
            ? "Sin stock"
            : undefined,
    },
    { key: "min", label: filters.min && `Desde $${filters.min}` },
    { key: "max", label: filters.max && `Hasta $${filters.max}` },
  ].filter((item) => item.label);
  function without(key: string) {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(parameters)) {
      if (name !== key && value) query.set(name, value);
    }
    return `${action}${query.size ? `?${query}` : ""}`;
  }
  return (
    <div className="catalog-discovery">
      <form
        action={action}
        method="get"
        className="catalog-filters"
        key={JSON.stringify(filters)}
      >
        <div className="catalog-search-row">
          <div className="catalog-search">
            <label htmlFor="catalog-search">Buscá por producto o marca</label>
            <div className="catalog-search-input">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                id="catalog-search"
                name="q"
                type="search"
                defaultValue={filters.q}
                list="catalog-suggestions"
                maxLength={100}
                placeholder="Encontrá tu próximo suplemento"
                autoComplete="off"
              />
            </div>
            <datalist id="catalog-suggestions">
              {[
                ...new Set([
                  ...catalog.products.map((product) => product.name),
                  ...catalog.brands.map((brand) => brand.name),
                ]),
              ]
                .slice(0, 30)
                .map((name) => (
                  <option key={name} value={name} />
                ))}
            </datalist>
          </div>
          <button
            type="submit"
            className="catalog-filter-submit"
            aria-label="Aplicar filtros"
          >
            Filtrar <Icon name="arrow" />
          </button>
        </div>
        <fieldset className="catalog-filter-rail">
          <legend className="sr-only">Afiná tu selección</legend>
          <label className="catalog-filter-field">
            <span>Categoría</span>
            <span className="catalog-select-wrap">
              <select
                name="categoria"
                aria-label="Categoría"
                defaultValue={filters.category ?? ""}
              >
                <option value="">Todas las categorías</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="catalog-filter-field">
            <span>Marca</span>
            <span className="catalog-select-wrap">
              <select
                name="marca"
                aria-label="Marca"
                defaultValue={filters.brand ?? ""}
              >
                <option value="">Todas las marcas</option>
                {catalog.brands.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="catalog-filter-field">
            <span>Sabor</span>
            <span className="catalog-select-wrap">
              <select
                name="sabor"
                aria-label="Sabor"
                defaultValue={filters.flavor ?? ""}
              >
                <option value="">Todos los sabores</option>
                {flavors.map((flavor) => (
                  <option key={flavor}>{flavor}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="catalog-filter-field">
            <span>Ordenar</span>
            <span className="catalog-select-wrap">
              <select
                name="orden"
                aria-label="Ordenar"
                defaultValue={filters.sort ?? "name"}
              >
                <option value="name">Nombre: A a Z</option>
                <option value="price-asc">Menor precio de lista</option>
                <option value="price-desc">Mayor precio de lista</option>
              </select>
            </span>
          </label>
        </fieldset>
        <div className="catalog-filter-footer">
          <details
            className="catalog-extra-filters"
            open={Boolean(filters.availability || filters.min || filters.max)}
          >
            <summary>
              Precio y disponibilidad <span aria-hidden="true">+</span>
            </summary>
            <div className="catalog-extra-fields">
              <label>
                Disponibilidad
                <select
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
            </div>
          </details>
          <Link href={action} className="catalog-clear">
            Limpiar filtros <Icon name="close" />
          </Link>
        </div>
      </form>
      {selections.length > 0 && (
        <nav className="catalog-selections" aria-label="Filtros activos">
          {selections.map((item) => (
            <Link
              href={without(item.key)}
              key={item.key}
              aria-label={`Quitar filtro ${item.label}`}
            >
              {item.label} <Icon name="close" />
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
