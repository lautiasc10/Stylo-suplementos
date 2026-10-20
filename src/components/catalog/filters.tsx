import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  AutomaticFilterForm,
  FilterOptions,
  FilterPanel,
} from "./filter-controls";
import type {
  Catalog,
  CatalogFilters,
  CatalogGroup,
} from "@/modules/catalog/model";
import { flavorLabel } from "@/modules/catalog/model";

type FilterProps = {
  catalog: Catalog;
  filters: CatalogFilters;
  action: string;
  categories?: Pick<CatalogGroup, "id" | "name" | "slug">[];
};

function selections({
  catalog,
  filters,
  categories = catalog.categories,
}: FilterProps) {
  return [
    { key: "q", label: filters.q && `Búsqueda: ${filters.q}` },
    {
      key: "categoria",
      label: categories.find((item) => item.slug === filters.category)?.name,
    },
    {
      key: "marca",
      label: catalog.brands.find((item) => item.slug === filters.brand)?.name,
    },
    { key: "sabor", label: filters.flavor && flavorLabel(filters.flavor) },
    {
      key: "promocion",
      label: filters.promotion === "active" ? "Promociones" : undefined,
    },
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
}

export function CatalogActiveFilters(props: FilterProps) {
  const { filters, action } = props;
  const active = selections(props);
  const parameters = {
    q: filters.q,
    categoria: filters.category,
    marca: filters.brand,
    sabor: filters.flavor,
    promocion: filters.promotion,
    disponibilidad: filters.availability,
    min: filters.min,
    max: filters.max,
    orden: filters.sort,
  };
  function without(key: string) {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(parameters)) {
      if (name !== key && value) query.set(name, value);
    }
    return `${action}${query.size ? `?${query}` : ""}`;
  }
  if (!active.length) return null;
  return (
    <nav className="catalog-selections" aria-label="Filtros activos">
      {active.map((item) => (
        <Link
          href={without(item.key)}
          key={item.key}
          aria-label={`Quitar filtro ${item.label}`}
        >
          {item.label} <Icon name="close" />
        </Link>
      ))}
    </nav>
  );
}

export function CatalogFilterSidebar(props: FilterProps) {
  const { catalog, filters, action, categories = catalog.categories } = props;
  const flavors = [
    ...new Set(
      catalog.products.flatMap((product) =>
        product.variants
          .filter((variant) => variant.active)
          .map((variant) => flavorLabel(variant.flavor))
          .filter(Boolean),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  return (
    <aside className="catalog-sidebar" aria-label="Filtros del catálogo">
      <FilterPanel activeCount={selections(props).length}>
        <AutomaticFilterForm
          action={action}
          values={{
            q: filters.q,
            categoria: filters.category,
            marca: filters.brand,
            sabor: flavorLabel(filters.flavor ?? ""),
            promocion: filters.promotion,
            orden: filters.sort ?? "name",
            disponibilidad: filters.availability,
            min: filters.min,
            max: filters.max,
          }}
        >
          <div className="catalog-filter-heading">
            <h2>Filtros</h2>
            <Link
              href={action}
              className="catalog-clear"
              aria-label="Limpiar filtros"
            >
              Limpiar <Icon name="close" />
            </Link>
          </div>
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
                maxLength={100}
                placeholder="Producto o marca"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="catalog-filter-groups">
            <FilterOptions
              label="Categoría"
              name="categoria"
              value={filters.category}
              options={[
                { value: "", label: "Todas las categorías" },
                ...categories.map((item) => ({
                  value: item.slug,
                  label: item.name,
                })),
              ]}
            />
            <FilterOptions
              label="Marca"
              name="marca"
              value={filters.brand}
              options={[
                { value: "", label: "Todas las marcas" },
                ...catalog.brands.map((item) => ({
                  value: item.slug,
                  label: item.name,
                })),
              ]}
            />
            <FilterOptions
              label="Sabor"
              name="sabor"
              value={filters.flavor}
              options={[
                { value: "", label: "Todos los sabores" },
                ...flavors.map((flavor) => ({ value: flavor, label: flavor })),
              ]}
            />
            <FilterOptions
              label="Promociones"
              name="promocion"
              value={filters.promotion}
              options={[
                { value: "", label: "Todos los productos" },
                { value: "active", label: "Con promoción" },
              ]}
            />
            <FilterOptions
              label="Ordenar"
              name="orden"
              value={filters.sort ?? "name"}
              options={[
                { value: "name", label: "Nombre: A a Z" },
                { value: "price-asc", label: "Menor precio" },
                { value: "price-desc", label: "Mayor precio" },
              ]}
            />
            <details
              className="catalog-extra-filters"
              open={Boolean(filters.availability || filters.min || filters.max)}
            >
              <summary>
                Precio y disponibilidad{" "}
                <span className="catalog-filter-chevron" aria-hidden="true" />
              </summary>
              <fieldset className="catalog-filter-options">
                <legend>Disponibilidad</legend>
                {[
                  { value: "", label: "Todas" },
                  { value: "in-stock", label: "Con stock" },
                  { value: "out-of-stock", label: "Sin stock" },
                ].map((option) => (
                  <label className="catalog-filter-option" key={option.value}>
                    <input
                      type="radio"
                      name="disponibilidad"
                      value={option.value}
                      defaultChecked={
                        (filters.availability ?? "") === option.value
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <div className="catalog-price-fields">
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
          </div>
        </AutomaticFilterForm>
      </FilterPanel>
    </aside>
  );
}
