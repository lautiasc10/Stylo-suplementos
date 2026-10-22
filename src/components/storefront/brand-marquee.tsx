"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/catalog/brand-logo";
import { Icon } from "@/components/ui/icon";
import { useMotionPreference } from "@/components/ui/use-motion-preference";

type Brand = { id: string; name: string; slug: string; logo: string };

export function BrandMarquee({
  brands,
  catalogHref = "/catalogo",
}: {
  brands: Brand[];
  catalogHref?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useMotionPreference();
  useEffect(() => {
    const section = root.current;
    if (!section) return;
    section.dataset.enhanced = String(reduced === false);
    if (reduced !== false || !window.IntersectionObserver) return;
    let visible = false;
    const update = () => {
      section.dataset.running = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(section);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [reduced, brands.length]);
  if (!brands.length) return null;
  const repetitions = Math.max(1, Math.ceil(8 / brands.length));
  const logo = (brand: Brand) =>
    brand.logo ? (
      <BrandLogo src={brand.logo} name={brand.name} />
    ) : (
      <span className="brand-marquee-wordmark">{brand.name}</span>
    );
  return (
    <section
      ref={root}
      className="brand-marquee"
      data-paused={paused}
      aria-labelledby="brands-title"
    >
      <div className="brand-marquee-heading">
        <h2 id="brands-title">Marcas en STYLO</h2>
        {reduced === false && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Reanudar marcas" : "Pausar marcas"}
            aria-pressed={paused}
          >
            <Icon name={paused ? "play" : "pause"} />
          </button>
        )}
      </div>
      <div className="brand-marquee-viewport">
        <div className="brand-marquee-track">
          {[0, 1].map((group) => (
            <div
              className="brand-marquee-group"
              key={group}
              aria-hidden={group === 1 || undefined}
            >
              {Array.from({ length: repetitions }, (_, repeat) =>
                brands.map((brand) =>
                  group === 0 && repeat === 0 ? (
                    <Link
                      className="brand-marquee-item"
                      key={`${repeat}-${brand.id}`}
                      href={`${catalogHref}?marca=${encodeURIComponent(brand.slug)}`}
                      aria-label={`Ver productos de ${brand.name}`}
                    >
                      {logo(brand)}
                    </Link>
                  ) : (
                    <span
                      className="brand-marquee-item"
                      data-repeat
                      aria-hidden="true"
                      key={`${repeat}-${brand.id}`}
                    >
                      {logo(brand)}
                    </span>
                  ),
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
