"use client";

import { useEffect, type RefObject } from "react";

/** Scroll-driven translation + the reference's 18px wave, without React updates per frame. */
export function useScrollShowcase({ root, viewport, track, count, native = false }: {
  root: RefObject<HTMLElement | null>;
  viewport: RefObject<HTMLElement | null>;
  track: RefObject<HTMLElement | null>;
  count: number;
  native?: boolean;
}) {
  useEffect(() => {
    const section = root.current, view = viewport.current, row = track.current;
    if (!section || !view || !row) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 801px) and (min-height: 650px)");
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const cards = Array.from(row.children) as HTMLElement[];
    let distance = 0, frame = 0, visible = false, enhanced = false;
    const reset = () => {
      row.style.transform = "";
      cards.forEach((card) => card.style.removeProperty("transform"));
      section.style.setProperty("--showcase-progress", "0");
    };
    const update = () => {
      frame = 0;
      if (!enhanced || !visible || document.hidden) return;
      const bounds = section.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -bounds.top / Math.max(1, bounds.height - innerHeight)));
      row.style.transform = `translate3d(${-distance * progress}px, 0, 0)`;
      cards.forEach((card, index) => { card.style.transform = `translate3d(0, ${Math.sin(progress * 6 + index) * 18}px, 0)`; });
      section.style.setProperty("--showcase-progress", String(progress));
    };
    const measure = () => {
      distance = Math.max(0, row.scrollWidth - view.clientWidth + 32);
      enhanced = desktop.matches && !reduced.matches && !saver && !native && count > 1 && distance > 64;
      section.dataset.enhanced = String(enhanced);
      section.dataset.scrollEnhanced = String(enhanced);
      section.style.setProperty("--showcase-travel", `${enhanced ? Math.max(distance, innerHeight * 2.2) : 0}px`);
      if (!enhanced) reset();
      update();
    };
    const schedule = () => { if (!frame && enhanced && visible && !document.hidden) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); }, { rootMargin: "100px" });
    const resize = new ResizeObserver(measure);
    observer.observe(section);
    resize.observe(row);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", measure);
    desktop.addEventListener("change", measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", schedule);
      reduced.removeEventListener("change", measure);
      desktop.removeEventListener("change", measure);
      reset();
      section.dataset.enhanced = section.dataset.scrollEnhanced = "false";
    };
  }, [root, viewport, track, count, native]);
}
