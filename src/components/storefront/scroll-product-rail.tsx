"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMotionPreference } from "@/components/ui/use-motion-preference";

/** A native product row becomes a scroll-driven strip only on capable desktops. */
export function ScrollProductRail({ children, count, example }: { children: ReactNode; count: number; example: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [keyboard, setKeyboard] = useState(false);
  const reduced = useMotionPreference();
  useEffect(() => {
    const section = root.current;
    const view = viewport.current;
    const row = track.current;
    if (!section || !view || !row) return;
    if (count < 2 || reduced !== false || keyboard) {
      section.dataset.scrollEnhanced = "false";
      row.style.transform = "";
      return;
    }
    const desktop = matchMedia("(min-width: 960px)");
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let frame = 0, visible = false, enabled = false;
    const update = () => {
      frame = 0;
      if (!visible || !enabled || document.hidden) return;
      const rect = section.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)));
      const distance = Math.max(0, row.scrollWidth - view.clientWidth + 24);
      row.style.transform = `translate3d(${-progress * distance}px, 0, 0)`;
      section.style.setProperty("--rail-progress", progress.toFixed(3));
    };
    const schedule = () => { if (visible && enabled && !document.hidden && !frame) frame = requestAnimationFrame(update); };
    const eligibility = () => {
      enabled = desktop.matches && !saver && section.getBoundingClientRect().top >= innerHeight - 2;
      section.dataset.scrollEnhanced = String(enabled);
      row.style.transform = "";
      schedule();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else if (frame) { cancelAnimationFrame(frame); frame = 0; }
    });
    eligibility();
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    desktop.addEventListener("change", eligibility);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      desktop.removeEventListener("change", eligibility);
      document.removeEventListener("visibilitychange", schedule);
      row.style.transform = "";
      section.dataset.scrollEnhanced = "false";
    };
  }, [count, reduced, keyboard]);
  return (
    <div ref={root} className="scroll-product-rail" data-keyboard={keyboard}>
      <div className="scroll-product-rail-heading">
        <p className="reference-eyebrow">{example ? "SELECCIÓN DE EJEMPLO · STYLO" : "RECIÉN LLEGADOS"}</p>
        <h2>Nove<br /><span className="reference-text-gold">dades</span></h2>
        <p>{example ? "Productos de ejemplo para recorrer la sección." : "Lo último que entró a la tienda. Seguí bajando para recorrerlo."}</p>
      </div>
      <div
        ref={viewport}
        className="scroll-product-rail-viewport"
        role="region"
        aria-label="Novedades"
        tabIndex={0}
        onKeyDownCapture={() => setKeyboard(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboard(false);
        }}
      >
        <div ref={track} className="scroll-product-rail-track">{children}</div>
      </div>
      <p className="scroll-product-rail-hint" aria-hidden="true">Seguí bajando para ver más</p>
    </div>
  );
}
