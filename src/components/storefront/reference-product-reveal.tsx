"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useMotionPreference } from "@/components/ui/use-motion-preference";
import type { ReferenceProduct } from "./reference-product";

/** Scroll choreography from the owner's ProductReveal, with visible server HTML,
 * no perpetual offscreen clock and no React state updates during scrolling. */
export function ReferenceProductReveal({
  product,
}: {
  product: ReferenceProduct | null;
}) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useMotionPreference();
  useEffect(() => {
    const section = root.current,
      surface = canvas.current;
    if (!section || !surface || !product || reduced !== false) return;
    const context = surface.getContext("2d");
    if (!context) return;
    const desktop = matchMedia("(min-width: 960px)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    let frame: number | null = null,
      visible = false,
      enhanced = false,
      progress = 0,
      previous = 0;
    let width = 0,
      height = 0;
    let seed = 741;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const dust = Array.from({ length: 160 }, () => {
      const angle = random() * Math.PI * 2,
        distance = 0.6 + random() * 0.9;
      return {
        sx: Math.cos(angle) * distance,
        sy: Math.sin(angle) * distance,
        tx: (random() - 0.5) * 0.28,
        ty: (random() - 0.5) * 0.42,
        r: random() * 1.8 + 0.4,
      };
    });
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previous = 0;
    };
    function paint() {
      if (!section || !context) return;
      section.style.setProperty("--reference-progress", progress.toFixed(4));
      context.clearRect(0, 0, width, height);
      const converge = Math.min(1, progress / 0.45),
        ease = 1 - Math.pow(1 - converge, 3);
      const fade = 1 - Math.min(1, Math.max(0, (progress - 0.4) / 0.15));
      if (fade <= 0) return;
      const length = Math.min(width, height) * 0.6;
      for (const particle of dust) {
        context.globalAlpha = (0.35 + ease * 0.6) * fade;
        context.fillStyle = particle.r > 1.4 ? "#f5d78a" : "#c8902f";
        context.beginPath();
        context.arc(
          width / 2 +
            (particle.sx + (particle.tx - particle.sx) * ease) * length,
          height / 2 +
            (particle.sy + (particle.ty - particle.sy) * ease) * length,
          particle.r,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      context.globalAlpha = 1;
    }
    function tick(now: number) {
      frame = null;
      if (!section || !visible || document.hidden || !enhanced) return;
      const rect = section.getBoundingClientRect();
      const target = Math.min(
        1,
        Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)),
      );
      const delta = previous ? Math.min(50, now - previous) : 1000 / 60;
      previous = now;
      progress += (target - progress) * (1 - Math.exp(-delta / 120));
      if (Math.abs(target - progress) < 0.0005) progress = target;
      paint();
      if (progress !== target) frame = requestAnimationFrame(tick);
      else previous = 0;
    }
    function schedule() {
      if (visible && enhanced && !document.hidden && frame === null)
        frame = requestAnimationFrame(tick);
    }
    function resize() {
      if (!section || !surface || !context) return;
      width = section.clientWidth;
      height = innerHeight;
      const scale = Math.min(
        devicePixelRatio || 1,
        1.5,
        1600 / width,
        1000 / height,
      );
      surface.width = Math.ceil(width * scale);
      surface.height = Math.ceil(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      schedule();
    }
    function eligibility() {
      if (!section) return;
      stop();
      // Never insert a tall sticky stage around a shopper already reading it.
      enhanced =
        desktop.matches &&
        !connection?.saveData &&
        section.getBoundingClientRect().top >= innerHeight - 2;
      if (enhanced) {
        section.dataset.scrollEnhanced = "true";
        progress = 0;
        paint();
      } else {
        delete section.dataset.scrollEnhanced;
        section.style.removeProperty("--reference-progress");
      }
      resize();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else stop();
    });
    const visibility = () => {
      if (document.hidden) stop();
      else schedule();
    };
    eligibility();
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    desktop.addEventListener("change", eligibility);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", resize);
      desktop.removeEventListener("change", eligibility);
      document.removeEventListener("visibilitychange", visibility);
      delete section.dataset.scrollEnhanced;
      section.style.removeProperty("--reference-progress");
    };
  }, [reduced, product]);

  if (!product)
    return (
      <section className="reference-showcase-empty reference-container">
        <p className="reference-eyebrow">La selección STYLO</p>
        <h2>
          Tu próxima <span className="reference-text-gold">elección.</span>
        </h2>
        <Link className="hero-pill hero-pill-primary" href="/catalogo">
          Explorar tienda
        </Link>
      </section>
    );
  return (
    <section
      ref={root}
      id="producto-destacado"
      className="reference-showcase"
      aria-labelledby="reference-product-title"
    >
      <div className="reference-showcase-sticky">
        <div className="reference-showcase-glow" aria-hidden="true" />
        <canvas ref={canvas} aria-hidden="true" />
        <div className="reference-showcase-content reference-container">
          <div className="reference-showcase-copy">
            <p
              className="reference-eyebrow reference-scroll-reveal"
              style={{ "--reveal-start": 0.45 } as React.CSSProperties}
            >
              {product.brand} · La selección STYLO
            </p>
            <h2
              id="reference-product-title"
              aria-label={product.name}
              className="reference-scroll-reveal"
              style={{ "--reveal-start": 0.5 } as React.CSSProperties}
            >
              {product.title.map((line, index) => (
                <span
                  key={line}
                  className={index ? "reference-text-gold" : undefined}
                >
                  {line}
                </span>
              ))}
            </h2>
            <p
              className="reference-showcase-description reference-scroll-reveal"
              style={{ "--reveal-start": 0.55 } as React.CSSProperties}
            >
              {product.description}
            </p>
          </div>
          <div className="reference-showcase-pack">
            <img
              src={product.image.src}
              srcSet={product.image.srcSet}
              sizes="(min-width: 960px) 430px, 85vw"
              width={1000}
              height={1000}
              alt={product.image.alt}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="reference-showcase-facts">
            {product.facts.map((fact, index) => (
              <div
                className="reference-showcase-fact reference-scroll-reveal"
                key={fact.label}
                style={
                  {
                    "--reveal-start": 0.6 + index * 0.04,
                  } as React.CSSProperties
                }
              >
                <strong className="reference-text-gold">{fact.value}</strong>
                <span>{fact.label}</span>
              </div>
            ))}
            <Link
              className="hero-pill hero-pill-primary reference-showcase-buy reference-scroll-reveal"
              href={product.href}
              style={{ "--reveal-start": 0.8 } as React.CSSProperties}
            >
              Comprar ahora
            </Link>
          </div>
        </div>
        <p className="reference-showcase-hint" aria-hidden="true">
          Seguí bajando
        </p>
      </div>
    </section>
  );
}
