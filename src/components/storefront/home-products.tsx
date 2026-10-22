import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import { Icon } from "@/components/ui/icon";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { SectionHeading } from "./section-heading";
import { HomeProductCarousel } from "./home-product-carousel";
import { ScrollProductRail } from "./scroll-product-rail";
import { ArrivalCard } from "./arrival-card";
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
  if (id === "novedades" && products.length) {
    return (
      <section id={id} className="home-collection home-collection-rail" aria-label="Novedades">
        <ScrollProductRail count={products.length} example={eyebrow.includes("EJEMPLO")}>
          {products.map((product) => (
            <ArrivalCard key={product.id} product={product} catalog={catalog} imageBase={imageBase} example={eyebrow.includes("EJEMPLO")} />
          ))}
        </ScrollProductRail>
      </section>
    );
  }
  const cards = products.map((product, index) => (
    <RevealItem key={product.id} className="reveal-card">
      <ProductCard
        product={product}
        variants={product.variants}
        initialVariantId={
          (product.variants.find((v) => v.stock > 0) ?? product.variants[0]).id
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
    </RevealItem>
  ));
  return (
    <section
      id={id}
      className="home-collection"
      aria-labelledby={`${id}-title`}
    >
      <div className="container">
        <SectionHeading id={`${id}-title`} title={title} eyebrow={eyebrow} />
        {products.length ? (
          id === "destacados" ? (
            <HomeProductCarousel count={products.length}>
              {cards}
            </HomeProductCarousel>
          ) : (
            <RevealGroup className="home-product-grid" delay={0.16}>
              {cards}
            </RevealGroup>
          )
        ) : (
          <Reveal className="home-collection-empty">
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
          </Reveal>
        )}
      </div>
    </section>
  );
}
