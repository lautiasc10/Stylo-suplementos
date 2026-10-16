import Link from "next/link";
import { CatalogActiveFilters, CatalogFilterSidebar } from "./filters";
import { ProductCard } from "./product-card";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
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
}: {
  catalog: Catalog;
  filters: CatalogFilters;
  action?: string;
  productPrefix?: string;
  imageBase?: string;
  imageUrls?: Record<string, string>;
  preview?: boolean;
  filterCategories?: Pick<CatalogGroup, "id" | "name" | "slug">[];
}) {
  const data = publicCatalog(catalog),
    results = filterCatalog(data, filters);
  return (
    <div className="catalog-layout">
      <CatalogFilterSidebar
        catalog={data}
        filters={filters}
        action={action}
        categories={filterCategories}
      />
      <section className="catalog-results" aria-label="Resultados del catálogo">
        <CatalogActiveFilters
          catalog={data}
          filters={filters}
          action={action}
          categories={filterCategories}
        />
        <div className="catalog-results-heading">
          <p role="status">
            {results.length} {results.length === 1 ? "producto" : "productos"}
          </p>
          <p>Encontrá lo que acompaña tu rutina.</p>
        </div>
        {results.length ? (
          <RevealGroup
            className="product-grid"
            revision={JSON.stringify(filters)}
          >
            {results.map(({ product, variant, brand }, index) => {
              const category = data.categories.find((item) =>
                product.categoryIds.includes(item.id),
              );
              return (
                <RevealItem key={product.id} className="reveal-card">
                  <ProductCard
                    key={`${product.id}:${JSON.stringify(filters)}`}
                    product={product}
                    variants={matchingVariants(product, filters)}
                    initialVariantId={variant.id}
                    brand={brand}
                    category={category}
                    index={index}
                    productPrefix={productPrefix}
                    imageBase={imageBase}
                    imageUrls={imageUrls}
                    preview={preview}
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
  );
}
