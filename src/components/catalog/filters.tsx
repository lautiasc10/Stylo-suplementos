import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  AutomaticFilterForm,
  FilterOptions,
  FilterPanel,
  CatalogSortControl,
} from "./filter-controls";
import type {
  Catalog,
  CatalogFilters,
  CatalogGroup,
} from "@/modules/catalog/model";
import { flavorLabel, filterCatalog } from "@/modules/catalog/model";
import { CatalogPriceRange } from "./catalog-price-range";
import type { Promotion } from "@/modules/commerce/promotions";
import { promotedVariantIds } from "@/modules/commerce/product-offers";

type FilterProps = {
  catalog: Catalog;
  filters: CatalogFilters;
  action: string;
  categories?: Pick<CatalogGroup, "id" | "name" | "slug">[];
  promotions?: Promotion[];
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
      label: catalog.brands
        .filter((item) => filters.brand?.split(",").includes(item.slug))
        .map((item) => item.name)
        .join(", "),
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

function valuesFor(filters: CatalogFilters) {
  return {
    q: filters.q,
    categoria: filters.category,
    marca: filters.brand,
    sabor: flavorLabel(filters.flavor ?? ""),
    promocion: filters.promotion,
    orden: filters.sort ?? "featured",
    disponibilidad: filters.availability,
    min: filters.min,
    max: filters.max,
  };
}

const filterFormId = (action: string) =>
  `catalog-filter-${action.replace(/[^a-z0-9]/gi, "-")}`;

export function CatalogSort({
  filters,
  action,
}: Pick<FilterProps, "filters" | "action">) {
  return (
    <CatalogSortControl
      formId={filterFormId(action)}
      value={filters.sort ?? "featured"}
    />
  );
}

export function CatalogFilterSidebar(props: FilterProps) {
  const {
    catalog,
    filters,
    action,
    categories = catalog.categories,
    promotions = [],
  } = props;
  const promoted = promotedVariantIds(catalog, promotions);
  const count = (category?: string) =>
    filterCatalog(catalog, { ...filters, category }, promoted).length;
  const maximum = Math.max(
    10000,
    ...catalog.products.flatMap((p) =>
      p.variants.map((v) => v.listPrice / 100),
    ),
  );
  const ceiling = Math.ceil(maximum / 1000) * 1000;
  const flavors = [
    ...new Set(
      catalog.products.flatMap((p) =>
        p.variants
          .filter((v) => v.active)
          .map((v) => flavorLabel(v.flavor))
          .filter(Boolean),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  return (
    <aside className="catalog-sidebar" aria-label="Filtros del catálogo">
      <FilterPanel activeCount={selections(props).length}>
        <AutomaticFilterForm
          id={filterFormId(action)}
          action={action}
          values={valuesFor(filters)}
        >
          <div className="catalog-filter-heading">
            <h2>Filtros</h2>
            <Link
              href={action}
              className="catalog-clear"
              aria-label="Limpiar filtros"
            >
              Limpiar
            </Link>
          </div>
          <div className="catalog-search">
            <label className="sr-only" htmlFor="catalog-search">
              Buscá por producto o marca
            </label>
            <div className="catalog-search-input">
              <input
                id="catalog-search"
                name="q"
                type="search"
                defaultValue={filters.q}
                maxLength={100}
                placeholder="Buscar producto o marca"
                autoComplete="off"
              />
            </div>
          </div>
          <fieldset className="catalog-choice-list catalog-category-list">
            <legend>Categoría</legend>
            {[{ slug: "", name: "Todas" }, ...categories].map((item) => (
              <label className="catalog-category-choice" key={item.slug}>
                <input
                  type="radio"
                  name="categoria"
                  value={item.slug}
                  defaultChecked={(filters.category ?? "") === item.slug}
                />
                <span>{item.name}</span>
                <span
                  className="catalog-category-count"
                  aria-label={`${count(item.slug || undefined)} productos`}
                >
                  {count(item.slug || undefined)}
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="catalog-choice-list catalog-brand-list">
            <legend>Marca</legend>
            {catalog.brands.map((item) => (
              <label className="catalog-checkbox" key={item.id}>
                <input
                  type="checkbox"
                  name="marca"
                  value={item.slug}
                  defaultChecked={
                    filters.brand?.split(",").includes(item.slug) ?? false
                  }
                />
                <span>{item.name}</span>
              </label>
            ))}
          </fieldset>
          <CatalogPriceRange value={filters.max} ceiling={ceiling} />
          <fieldset className="catalog-choice-list catalog-toggle-list">
            <legend className="sr-only">Disponibilidad y promociones</legend>
            {filters.availability === "out-of-stock" && (
              <input type="hidden" name="disponibilidad" value="out-of-stock" />
            )}
            <label className="catalog-checkbox">
              <input
                type="checkbox"
                name="disponibilidad"
                value="in-stock"
                defaultChecked={filters.availability === "in-stock"}
              />
              <span>Solo con stock</span>
            </label>
            <label className="catalog-checkbox">
              <input
                type="checkbox"
                name="promocion"
                value="active"
                defaultChecked={filters.promotion === "active"}
              />
              <span>Solo promociones</span>
            </label>
          </fieldset>
          <div className="catalog-additional-filters">
            <FilterOptions
              label="Sabor"
              name="sabor"
              value={filters.flavor}
              options={[
                { value: "", label: "Todos los sabores" },
                ...flavors.map((flavor) => ({ value: flavor, label: flavor })),
              ]}
            />
            <label className="catalog-min-price">
              Desde (ARS)
              <input
                name="min"
                inputMode="decimal"
                defaultValue={filters.min}
                placeholder="Sin mínimo"
                pattern="[0-9]+([.,][0-9]{1,2})?"
              />
            </label>
          </div>
        </AutomaticFilterForm>
      </FilterPanel>
    </aside>
  );
}
