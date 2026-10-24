"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "@/components/ui/use-motion-preference";
import { useCart } from "@/components/commerce/cart-provider";
import type { ReferenceProduct } from "./reference-product";

let finishedThisVisit = false;
const FINALE_SPAN = 0.55;
const PRODUCT_SCROLL_VH = 110;

function SellersPodium({ products, className, showHeading = true }: { products: ReferenceProduct[]; className: string; showHeading?: boolean }) {
  const { change, busy } = useCart();
  return (
    <div className={className}>
      {showHeading && <div className="scroll-sellers-podium-heading">
        <div>
          <p className="reference-eyebrow">SELECCIÓN DE EJEMPLO · STYLO</p>
          <h2>Los más <span className="reference-text-gold">vendidos</span></h2>
        </div>
        <p>Explorá tres presentaciones del catálogo.</p>
      </div>}
      <div className="scroll-sellers-podium-grid">
        {products.map((item, index) => (
          <article className="scroll-sellers-podium-card" data-rank={index + 1} key={item.id}>
            <span className="scroll-sellers-podium-number" aria-hidden="true">{index + 1}</span>
            {index === 0 && <span className="scroll-sellers-podium-badge">Ejemplo destacado</span>}
            <Link className="scroll-sellers-podium-link" href={item.href}>
              <img src={item.image.src} srcSet={item.image.srcSet} sizes="(min-width: 960px) 340px, (min-width: 620px) 40vw, 75vw" width={600} height={600} loading="lazy" decoding="async" alt={item.image.alt} />
              <span className="scroll-sellers-podium-brand">{item.brand}</span>
              <h3>{item.displayName}</h3>
              <span className="scroll-sellers-podium-variant">{item.description}</span>
            </Link>
            <div className="scroll-sellers-podium-bottom">
              <strong>{item.facts[1]?.value}</strong>
              <button type="button" disabled={busy || item.facts[3]?.value !== "Disponible"} onClick={(event) => change(item.variantId, "add", 1, event.currentTarget.getBoundingClientRect())}>+ Agregar</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** One sticky stage: protein dust forms each pack as the page advances. */
export function ScrollBestSellers({ products }: { products: ReferenceProduct[] }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);
  const [podiumShown, setPodiumShown] = useState(false);
  const reduced = useMotionPreference();
  const { change, busy } = useCart();

  useEffect(() => {
    const section = root.current;
    const surface = canvas.current;
    if (!section || !surface || products.length === 0) return;
    if (window.location.hash === "#atletas") finishedThisVisit = true;
    if (reduced !== false || finishedThisVisit) {
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
    let shown = false;
    let frozen = false;
    let releaseFrame = 0;
    let restoreAnchor: (() => void) | undefined;
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
    const finish = (compensate = true) => {
      if (frozen) return;
      frozen = true;
      finishedThisVisit = true;
      section.style.setProperty("--seller-progress", "1");
      section.style.setProperty("--seller-out", "1");
      section.style.setProperty("--seller-podium", "1");
      section.dataset.sellerFinale = "true";
      context.clearRect(0, 0, width, height);
      if (!shown) { shown = true; setPodiumShown(true); }

      // Release only the consumed, off-screen runway. Compensating in the same
      // frame keeps the sticky stage (or the following section) in place.
      const before = section.getBoundingClientRect();
      const scrollBefore = window.scrollY;
      const documentStyle = document.documentElement.style;
      const previousAnchor = documentStyle.overflowAnchor;
      documentStyle.overflowAnchor = "none";
      restoreAnchor = () => { documentStyle.overflowAnchor = previousAnchor; };
      section.dataset.scrollComplete = "true";
      const removed = Math.max(0, before.height - section.getBoundingClientRect().height);
      const consumed = Math.min(removed, Math.max(0, -before.top));
      if (compensate && consumed > 0) window.scrollTo({ top: scrollBefore - consumed, behavior: "instant" });
      releaseFrame = requestAnimationFrame(() => {
        releaseFrame = 0;
        restoreAnchor?.();
        restoreAnchor = undefined;
      });
    };
    const update = () => {
      frame = 0;
      if (!enabled || !visible || document.hidden || frozen) return;
      const rect = section.getBoundingClientRect();
      const next = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)));
      if (next < 1 && Math.abs(progress - next) < 0.0003) return;
      progress = next;
      const position = next * (products.length + FINALE_SPAN);
      const isFinale = position >= products.length;
      const segment = Math.min(products.length - 1, Math.floor(position));
      const local = isFinale ? 1 : Math.min(1, position - segment);
      const finale = Math.min(1, Math.max(0, (position - products.length) / FINALE_SPAN));
      // The last pack stays visible until its own bar finishes. Its only exit
      // is the podium transition; there is no fade-out followed by a reset.
      const outgoing = segment === products.length - 1 ? finale : Math.min(1, Math.max(0, (local - 0.82) / 0.18));
      section.dataset.sellerFinale = String(isFinale);
      section.style.setProperty("--seller-progress", local.toFixed(4));
      section.style.setProperty("--seller-out", outgoing.toFixed(4));
      section.style.setProperty("--seller-podium", finale.toFixed(4));
      if (isFinale) context.clearRect(0, 0, width, height);
      else paint(local, outgoing);
      if (segment !== index) { index = segment; setActive(segment); }
      const nextShown = finale >= 0.95;
      if (nextShown !== shown) { shown = nextShown; setPodiumShown(nextShown); }
      if (finale >= 0.9999) finish();
    };
    const schedule = () => {
      if (enabled && visible && !document.hidden && !frozen && !frame) frame = requestAnimationFrame(update);
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
      enabled = desktop.matches && !dataSaver && !finishedThisVisit && section.getBoundingClientRect().top >= innerHeight - 2;
      section.dataset.scrollEnhanced = String(enabled);
      if (enabled) resize();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        // Large wheel/page-down jumps can leave the stage between two frames.
        if (enabled && entry.boundingClientRect.bottom <= 0) finish();
      }
    });
    eligibility();
    const anchorNavigation = () => finish(false);
    window.addEventListener("stylo:home-anchor", anchorNavigation);
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    desktop.addEventListener("change", eligibility);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (releaseFrame) cancelAnimationFrame(releaseFrame);
      restoreAnchor?.();
      observer.disconnect();
      window.removeEventListener("stylo:home-anchor", anchorNavigation);
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
      style={{ "--seller-scroll-vh": 100 + (products.length + FINALE_SPAN) * PRODUCT_SCROLL_VH } as React.CSSProperties}
    >
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
        <div key={product.id} className="scroll-sellers-product" inert={podiumShown}>
          <div className="scroll-sellers-copy">
            <p>N.º {active + 1} · {product.brand}</p>
            <h3>{product.displayName}</h3>
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
        <div className="scroll-sellers-podium-overlay" inert={!podiumShown} aria-hidden={!podiumShown}>
          <SellersPodium products={products} className="scroll-sellers-podium" showHeading={false} />
        </div>
        <p className="scroll-sellers-hint" aria-hidden="true">Seguí bajando</p>
      </div>
      <SellersPodium products={products} className="reference-container scroll-sellers-fallback scroll-sellers-podium" />
    </section>
  );
}
