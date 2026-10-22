"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "@/components/ui/use-motion-preference";
import { useCart } from "@/components/commerce/cart-provider";
import type { ReferenceProduct } from "./reference-product";

/** One sticky stage: protein dust forms each pack as the page advances. */
export function ScrollBestSellers({ products }: { products: ReferenceProduct[] }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useMotionPreference();
  const { change, busy } = useCart();

  useEffect(() => {
    const section = root.current;
    const surface = canvas.current;
    if (!section || !surface || products.length === 0) return;
    if (reduced !== false) {
      section.dataset.scrollEnhanced = "false";
      return;
    }
    const context = surface.getContext("2d");
    if (!context) return;
    const desktop = matchMedia("(min-width: 960px)");
    const dataSaver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let frame = 0;
    let visible = false;
    let enabled = false;
    let index = 0;
    let width = 0;
    let height = 0;
    let progress = -1;
    let seed = 451;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    const particles = Array.from({ length: 180 }, () => {
      const angle = random() * Math.PI * 2;
      const distance = 0.65 + random() * 0.9;
      return {
        sx: Math.cos(angle) * distance,
        sy: Math.sin(angle) * distance,
        tx: (random() - 0.5) * 0.3,
        ty: (random() - 0.5) * 0.46,
        radius: 0.4 + random() * 1.6,
      };
    });
    const paint = (local: number, outgoing: number) => {
      context.clearRect(0, 0, width, height);
      const collect = Math.min(1, local / 0.42);
      const eased = 1 - (1 - collect) ** 3;
      const incomingAlpha = 1 - Math.min(1, Math.max(0, (local - 0.32) / 0.13));
      const opacity = outgoing > 0 ? outgoing * (1 - outgoing) * 4 : incomingAlpha;
      if (opacity <= 0) return;
      const length = Math.min(width, height) * 0.58;
      const blend = outgoing > 0 ? 1 - outgoing : eased;
      for (const particle of particles) {
        context.globalAlpha = (0.35 + blend * 0.6) * opacity;
        context.fillStyle = particle.radius > 1.4 ? "#f5d78a" : "#c8902f";
        context.beginPath();
        context.arc(
          width / 2 + (particle.sx + (particle.tx - particle.sx) * blend) * length,
          height / 2 + (particle.sy + (particle.ty - particle.sy) * blend) * length,
          particle.radius,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      context.globalAlpha = 1;
    };
    const update = () => {
      frame = 0;
      if (!enabled || !visible || document.hidden) return;
      const rect = section.getBoundingClientRect();
      const next = Math.min(0.9999, Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)));
      if (Math.abs(progress - next) < 0.0003) return;
      progress = next;
      const segment = Math.min(products.length - 1, Math.floor(next * products.length));
      const local = Math.min(1, next * products.length - segment);
      const outgoing = segment < products.length - 1
        ? Math.min(1, Math.max(0, (local - 0.82) / 0.18))
        : 0;
      section.style.setProperty("--seller-progress", local.toFixed(4));
      section.style.setProperty("--seller-out", outgoing.toFixed(4));
      paint(local, outgoing);
      if (segment !== index) { index = segment; setActive(segment); }
    };
    const schedule = () => {
      if (enabled && visible && !document.hidden && !frame) frame = requestAnimationFrame(update);
    };
    const resize = () => {
      width = surface.clientWidth;
      height = surface.clientHeight;
      const scale = Math.min(devicePixelRatio || 1, 1.5, 1600 / Math.max(width, 1));
      surface.width = Math.ceil(width * scale);
      surface.height = Math.ceil(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      progress = -1;
      schedule();
    };
    const eligibility = () => {
      enabled = desktop.matches && !dataSaver && section.getBoundingClientRect().top >= innerHeight - 2;
      section.dataset.scrollEnhanced = String(enabled);
      if (enabled) resize();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else if (frame) { cancelAnimationFrame(frame); frame = 0; }
    });
    eligibility();
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    desktop.addEventListener("change", eligibility);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", resize);
      desktop.removeEventListener("change", eligibility);
      document.removeEventListener("visibilitychange", schedule);
      section.dataset.scrollEnhanced = "false";
    };
  }, [products, reduced]);

  if (!products.length) return null;
  const product = products[active] ?? products[0];
  return (
    <section
      ref={root}
      id="mas-vendidos"
      className="scroll-sellers"
      aria-label="Los más vendidos, selección de ejemplo"
      style={{ "--seller-count": products.length } as React.CSSProperties}
    >
      <div className="reference-container scroll-sellers-mobile-heading">
        <p className="reference-eyebrow">SELECCIÓN DE EJEMPLO · STYLO</p>
        <h2>Los más <span className="reference-text-gold">vendidos</span></h2>
      </div>
      <div className="scroll-sellers-stage">
        <canvas ref={canvas} aria-hidden="true" />
        <div className="scroll-sellers-top">
          <div>
            <p className="reference-eyebrow">SELECCIÓN DE EJEMPLO · STYLO</p>
            <h2 id="sellers-heading">Los más <span className="reference-text-gold">vendidos</span></h2>
          </div>
          <div className="scroll-sellers-index" aria-label={`Producto ${active + 1} de ${products.length}`}>
            {products.map((item, index) => <span key={item.id} data-active={index === active}>{String(index + 1).padStart(2, "0")} <i /></span>)}
          </div>
        </div>
        <div key={product.id} className="scroll-sellers-product">
          <div className="scroll-sellers-copy">
            <p>N.º {active + 1} · {product.brand}</p>
            <h3>{product.displayName}{product.flavor && <span>{product.flavor}</span>}</h3>
            <span>{product.description}</span>
            <div className="scroll-sellers-product-progress" aria-hidden="true"><i /></div>
            <Link href={product.href}>Ver presentación <span aria-hidden="true">→</span></Link>
          </div>
          <img
            src={product.image.src}
            srcSet={product.image.srcSet}
            sizes="(min-width: 960px) 430px, 70vw"
            width={1000}
            height={1000}
            loading="lazy"
            decoding="async"
            alt={product.image.alt}
          />
          <div className="scroll-sellers-prices">
            {product.facts.slice(0, 4).map((fact) => (
              <div key={fact.label}><strong>{fact.value}</strong><span>{fact.label}</span></div>
            ))}
            <div className="scroll-sellers-purchase">
              <strong>{product.facts[1]?.value}</strong>
              <button type="button" disabled={busy} onClick={(event) => change(product.variantId, "add", 1, event.currentTarget.getBoundingClientRect())}>+ Agregar</button>
            </div>
          </div>
        </div>
        <p className="scroll-sellers-hint" aria-hidden="true">Seguí bajando</p>
      </div>
      <div className="reference-container scroll-sellers-fallback" aria-label="Productos de ejemplo">
        {products.map((item) => (
          <Link href={item.href} key={item.id}>
            <img src={item.image.src} alt="" width={320} height={320} loading="lazy" />
            <span>{item.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
