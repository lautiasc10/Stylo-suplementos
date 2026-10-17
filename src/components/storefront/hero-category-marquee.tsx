import Link from "next/link";

export type HeroCategory = { name: string; slug: string };

export function HeroCategoryMarquee({
  categories,
}: {
  categories: readonly HeroCategory[];
}) {
  if (!categories.length) return null;
  return (
    <nav className="hero-marquee" aria-label="Categorías de la tienda">
      <div className="hero-marquee-track">
        {[false, true].map((duplicate) => (
          <div
            className="hero-marquee-group"
            key={String(duplicate)}
            aria-hidden={duplicate || undefined}
          >
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/catalogo?categoria=${encodeURIComponent(category.slug)}`}
                tabIndex={duplicate ? -1 : undefined}
              >
                {category.name}
                <span aria-hidden="true">✦</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
