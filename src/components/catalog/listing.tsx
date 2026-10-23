import Link from "next/link";
import {
  CatalogActiveFilters,
  CatalogFilterSidebar,
  CatalogSort,
} from "./filters";
import { ProductCard } from "./product-card";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { ResultsScrollReset } from "./results-scroll-reset";
import { catalogReturnHref } from "@/modules/catalog/navigation";
import { availableBundles, matchingBundles } from "@/modules/commerce/catalog-bundles";
import { ComboCard } from "@/components/commerce/combo";
import { promotedVariantIds } from "@/modules/commerce/product-offers";
import type { Promotion } from "@/modules/commerce/promotions";
import {
  filterCatalog,
  publicCatalog,
  matchingVariants,
  type Catalog,
  type CatalogFilters,
  type CatalogGroup,
} from "@/modules/catalog/model";

export function CatalogListing({
  catalog,
  filters,
  action = "/catalogo",
  productPrefix = "/producto",
  imageBase = "",
  imageUrls = {},
  preview = false,
  filterCategories,
  promotions = [],
}: {
  catalog: Catalog;
  filters: CatalogFilters;
  action?: string;
  productPrefix?: string;
  imageBase?: string;
  imageUrls?: Record<string, string>;
  preview?: boolean;
  filterCategories?: Pick<CatalogGroup, "id" | "name" | "slug">[];
  promotions?: Promotion[];
}) {
  const data = publicCatalog(catalog),
    promoted = promotedVariantIds(data, promotions),
    results = filterCatalog(
      data,
      { ...filters, sort: filters.sort ?? "featured" },
      promoted,
    );
  const bundles = matchingBundles(data, availableBundles(data, promotions), filters);
  const entries = [...bundles.map((offer) => ({ kind: "bundle" as const, offer })),
    ...results.map((result) => ({ kind: "product" as const, result }))];
  if (filters.sort === "price-asc" || filters.sort === "price-desc") {
    const price = (entry: typeof entries[number]) => entry.kind === "bundle" ? entry.offer.listPrice : entry.result.variant.listPrice;
    entries.sort((a, b) => (price(a) - price(b)) * (filters.sort === "price-desc" ? -1 : 1));
  }
  return (
    <div className="catalog-store">
      <div className="catalog-store-heading">
        <h1>Tienda</h1>
        <p>Encontrá lo que acompaña tu rutina.</p>
      </div>
      <div className="catalog-layout">
        <ResultsScrollReset queryKey={JSON.stringify(filters)} />
        <CatalogFilterSidebar
          catalog={data}
          filters={filters}
          action={action}
          categories={filterCategories}
          promotions={promotions}
        />
        <section
          className="catalog-results"
          aria-label="Resultados del catálogo"
        >
          <CatalogActiveFilters
            catalog={data}
            filters={filters}
            action={action}
            categories={filterCategories}
          />
          <div className="catalog-results-heading">
            <p role="status">
              {entries.length} {entries.length === 1 ? "producto" : "productos"}
            </p>
            <CatalogSort filters={filters} action={action} />
          </div>
          {entries.length ? (
            <RevealGroup
              className="product-grid"
              revision={JSON.stringify(filters)}
            >
              {entries.map((entry, index) => {
                if (entry.kind === "bundle") return <RevealItem key={`combo:${entry.offer.id}`} className="reveal-card">
                  <ComboCard offer={entry.offer} imageBase={imageBase} imageUrls={imageUrls} preview={preview} returnHref={catalogReturnHref(action, filters)} />
                </RevealItem>;
                const { product, variant, brand } = entry.result;
                const category = data.categories.find((item) =>
                  product.categoryIds.includes(item.id),
                );
                return (
                  <RevealItem key={product.id} className="reveal-card">
                    <ProductCard
                      key={`${product.id}:${JSON.stringify(filters)}`}
                      product={product}
                      variants={matchingVariants(product, filters, promoted)}
                      initialVariantId={variant.id}
                      brand={brand}
                      category={category}
                      index={index}
                      productPrefix={productPrefix}
                      imageBase={imageBase}
                      imageUrls={imageUrls}
                      preview={preview}
                      returnHref={catalogReturnHref(action, filters)}
                    />
                  </RevealItem>
                );
              })}
            </RevealGroup>
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
                {data.products.length
                  ? "Ver todo el catálogo"
                  : "Volver al inicio"}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
