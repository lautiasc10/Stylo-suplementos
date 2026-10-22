"use client";

import { useRef, useState, type ReactNode } from "react";
import { useScrollShowcase } from "./use-scroll-showcase";

export function ScrollProductRail({ children, count, example }: { children: ReactNode; count: number; example: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [keyboard, setKeyboard] = useState(false);
  useScrollShowcase({ root, viewport, track, count, native: keyboard });
  return <div ref={root} className="scroll-product-rail" data-keyboard={keyboard}>
    <div className="scroll-product-rail-stage">
      <header className="scroll-product-rail-heading">
        <p className="reference-eyebrow">{example ? "SELECCIÓN DE EJEMPLO · STYLO" : "RECIÉN LLEGADOS"}</p>
        <h2>Nove<span className="reference-text-gold">dades</span></h2>
        <p>{example ? "Productos de ejemplo para recorrer la sección." : "Lo último que entró a la tienda. Seguí bajando para recorrerlo."}</p>
      </header>
      <div ref={viewport} className="scroll-product-rail-viewport" role="region" aria-label="Novedades" tabIndex={0}
        onKeyDownCapture={() => setKeyboard(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboard(false);
        }}>
        <div ref={track} className="scroll-product-rail-track">{children}</div>
      </div>
      <div className="scroll-product-rail-progress" aria-hidden="true"><span /></div>
    </div>
  </div>;
}
