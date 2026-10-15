import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { categories } from "@/modules/catalog/categories";
import {
  BrandTagline,
  ScrollReveal,
} from "@/components/storefront/scroll-reveal";
import { getCatalog } from "@/modules/catalog/server";
import { CinematicHero } from "@/components/storefront/cinematic-hero";

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
      <CinematicHero />
      <section
        id="categorias"
        className="container categories-section"
        aria-labelledby="categories-title"
      >
        <div className="category-heading">
          <div>
            <p className="eyebrow">ENCONTRÁ TU PRÓXIMA ELECCIÓN</p>
            <h2 id="categories-title">
              Tu rutina <span>empieza acá.</span>
            </h2>
          </div>
          <Link href="/catalogo" className="text-link">
            Todas las categorías
            <Icon name="arrow" />
          </Link>
        </div>
        <ScrollReveal className="featured-category-grid" stagger>
          {visibleCategories.slice(0, 3).map((category, index) => (
            <Link
              href={`/catalogo?categoria=${category.slug}`}
              className={`category-card featured-category category-${category.slug}`}
              key={category.slug}
            >
              <div className="featured-category-top">
                <span aria-hidden="true">
                  / {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="featured-category-copy">
                <h3>{category.name}</h3>
                <p>{category.detail}</p>
              </div>
              <span className="featured-category-action">
                Explorar categoría <Icon name="arrow" />
              </span>
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
