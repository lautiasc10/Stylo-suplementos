import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { categories } from "@/modules/catalog/categories";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import {
  BrandTagline,
  ScrollReveal,
} from "@/components/storefront/scroll-reveal";
import { getCatalog } from "@/modules/catalog/server";

export default async function HomePage() {
  const { catalog, configured, error } = await getCatalog();
  const visibleCategories =
    configured && !error
      ? catalog.categories
          .filter((item) => item.active)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : categories;
  return (
    <>
      <section className="sport-hero" aria-labelledby="hero-title">
        <div className="container sport-hero-inner">
          <h1 id="hero-title">
            <span className="hero-kicker">POTENCIÁ TU</span>{" "}
            <span className="hero-headline">
              MEJOR <span>VERSIÓN.</span>
            </span>
          </h1>
          <p className="hero-description">
            La constancia es tuya. Nosotros acompañamos el camino.
            <br /> Suplementos y accesorios para encontrar tu STYLO.
          </p>
          <a href="#categorias" className="button button-gold">
            Explorar categorías
            <Icon name="arrow" />
          </a>
          <p className="hero-note">
            <span />
            Estamos preparando nuestra tienda online.
          </p>
          <div className="hero-baseline" aria-hidden="true">
            <span>ROSARIO, ARGENTINA</span>
            <span>SUPLEMENTACIÓN / BIENESTAR / ENTRENAMIENTO</span>
          </div>
        </div>
      </section>
      <section
        id="categorias"
        className="container categories-section"
        aria-labelledby="categories-title"
      >
        <div className="category-heading">
          <div>
            <p className="eyebrow">ENCONTRÁ TU PRÓXIMA ELECCIÓN</p>
            <h2 id="categories-title">
              Tu rutina empieza acá<span>.</span>
            </h2>
          </div>
          <Link href="/catalogo" className="text-link">
            Todas las categorías
            <Icon name="arrow" />
          </Link>
        </div>
        <ScrollReveal className="featured-category-grid" stagger>
          {visibleCategories.slice(0, 3).map((category) => (
            <Link
              href={`/catalogo?categoria=${category.slug}`}
              className={`category-card featured-category category-${category.slug}`}
              key={category.slug}
            >
              <div className="featured-category-top">
                <span>Suplementación</span>
                <span className="category-arrow">
                  <Icon name="arrow" />
                </span>
              </div>
              <CategoryIllustration kind={category.slug} />
              <div className="featured-category-copy">
                <h3>{category.name}</h3>
                <p>{category.detail}</p>
              </div>
            </Link>
          ))}
        </ScrollReveal>
        <ScrollReveal className="more-categories">
          <p>También en STYLO</p>
          <div className="category-list">
            {visibleCategories.slice(3).map((category) => (
              <Link
                href={`/catalogo?categoria=${category.slug}`}
                className="category-card category-row"
                key={category.slug}
              >
                <span>{category.name}</span>
                <Icon name="arrow" />
              </Link>
            ))}
          </div>
        </ScrollReveal>
      </section>
      <section className="stylo-club container">
        <div className="club-brand">
          <Image
            src="/branding/logo-principal.webp"
            alt="Isotipo oficial de STYLO Suplementos"
            width={120}
            height={120}
          />
          <span>
            DESDE ROSARIO.
            <br />
            CON STYLO PROPIO.
          </span>
        </div>
        <div className="club-copy">
          <BrandTagline />
          <p>
            Deporte, bienestar e información clara.
            <br /> Conocé la marca detrás de tu próxima elección.
          </p>
        </div>
        <Link href="/nosotros" className="button button-outline">
          Conocé STYLO
          <Icon name="arrow" />
        </Link>
      </section>
    </>
  );
}
