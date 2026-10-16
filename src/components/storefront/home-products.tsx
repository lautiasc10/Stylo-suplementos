import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import { Icon } from "@/components/ui/icon";
import type { Catalog, Product } from "@/modules/catalog/model";

export function HomeProducts({
  id,
  title,
  eyebrow,
  products,
  catalog,
  imageBase,
  unavailable = false,
}: {
  id: string;
  title: string;
  eyebrow: string;
  products: Product[];
  catalog: Catalog;
  imageBase: string;
  unavailable?: boolean;
}) {
  return (
    <section
      id={id}
      className="home-collection"
      aria-labelledby={`${id}-title`}
    >
      <div className="container">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={`${id}-title`}>{title}</h2>
          </div>
          <Link href="/catalogo" className="text-link">
            Explorar tienda <Icon name="arrow" />
          </Link>
        </div>
        {products.length ? (
          <div className="home-product-grid">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                variants={product.variants}
                initialVariantId={
                  (
                    product.variants.find((v) => v.stock > 0) ??
                    product.variants[0]
                  ).id
                }
                brand={catalog.brands.find((b) => b.id === product.brandId)!}
                category={catalog.categories.find((c) =>
                  product.categoryIds.includes(c.id),
                )}
                index={index}
                productPrefix="/producto"
                imageBase={imageBase}
                imageUrls={{}}
                preview={false}
              />
            ))}
          </div>
        ) : (
          <div className="home-collection-empty">
            <p>
              {unavailable
                ? "No pudimos cargar los productos. Volvé a intentarlo en la tienda."
                : id === "novedades"
                  ? "Todavía no hay novedades para mostrar."
                  : "Explorá los productos disponibles en nuestra tienda."}
            </p>
            <Link href="/catalogo" className="text-link">
              Ver productos <Icon name="arrow" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
