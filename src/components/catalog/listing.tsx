import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { CatalogFilterBar } from "./filters";
import { ProductGallery } from "./product-gallery";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import {
  filterCatalog,
  formatPrice,
  publicCatalog,
  variantImages,
  variantLabel,
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
    <>
      <CatalogFilterBar
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
        <div className="product-grid">
          {results.map(({ product, variant, brand }, index) => {
            const category = data.categories.find((item) =>
              product.categoryIds.includes(item.id),
            );
            const photos = variantImages(product, variant.id)
              .filter((image) => imageBase || imageUrls[image.path])
              .map((image) => ({
                id: image.id,
                alt: image.alt,
                src: imageUrls[image.path] || `${imageBase}/${image.path}`,
              }));
            const href = `${productPrefix}/${product.slug}?variante=${variant.id}`;
            return (
              <article className="product-card" key={product.id}>
                <div className="product-card-media">
                  <span className="product-card-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {photos.length ? (
                    <ProductGallery
                      key={`${variant.id}:${photos.map((image) => image.id).join(":")}`}
                      images={photos}
                      href={href}
                      linkLabel={`Ver ${product.name}`}
                      delay={5200 + (index % 3) * 600}
                    />
                  ) : (
                    <Link
                      href={href}
                      aria-label={`Ver ${product.name}`}
                      className="product-placeholder"
                    >
                      <CategoryIllustration
                        kind={category?.slug ?? "proteinas"}
                      />
                      <span>
                        {preview
                          ? "Ilustración · datos de prueba"
                          : "Imagen pendiente"}
                      </span>
                    </Link>
                  )}
                </div>
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
                  <p className="product-card-variant">
                    {variantLabel(variant)}
                  </p>
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
                  <Link href={href} className="product-card-action">
                    Ver variantes <Icon name="arrow" />
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
