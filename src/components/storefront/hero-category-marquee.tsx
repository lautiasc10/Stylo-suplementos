import Link from "next/link";

// The owner's reference ribbon. Keep useful category links and the supplied copy.
const WORDS = [
  { name: "Proteína", href: "/catalogo?categoria=proteinas" },
  { name: "Creatina", href: "/catalogo?categoria=creatinas" },
  { name: "Pre-entreno", href: "/catalogo?categoria=pre-entrenos" },
  { name: "Aminoácidos", href: "/catalogo?categoria=aminoacidos" },
  { name: "Colágeno", href: "/catalogo?categoria=colageno" },
  { name: "Envíos a todo el país" },
] as const;

export function HeroCategoryMarquee() {
  return (
    <nav className="hero-marquee" aria-label="Categorías de la tienda">
      <div className="hero-marquee-track">
        {[false, true].map((duplicate) => (
          <div
            className="hero-marquee-group"
            key={String(duplicate)}
            aria-hidden={duplicate || undefined}
          >
            {WORDS.map((item) =>
              "href" in item ? (
                <Link
                  key={item.name}
                  href={item.href}
                  tabIndex={duplicate ? -1 : undefined}
                >
                  {item.name}
                  <span aria-hidden="true">✦</span>
                </Link>
              ) : (
                <span className="hero-marquee-note" key={item.name}>
                  {item.name}
                  <span aria-hidden="true">✦</span>
                </span>
              ),
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
