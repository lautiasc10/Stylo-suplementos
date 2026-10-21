"use client";

import { useEffect, useRef, useState } from "react";

export type CartOrigin = Pick<DOMRect, "left" | "top" | "width" | "height">;
const eventName = "stylo:cart-added";

/** Dispatch only after the real cart confirms the addition. */
export function announceCartAddition(origin?: CartOrigin) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: { origin } }));
}

export function CartArrival({ openCart }: { openCart: () => void }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = useRef(openCart);
  open.current = openCart;

  useEffect(() => {
    const animations = new Set<Animation>();
    const particles = new Set<HTMLElement>();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    function stopMotion() {
      if (!motion.matches) return;
      for (const animation of animations) animation.cancel();
      for (const particle of particles) particle.remove();
      animations.clear();
      particles.clear();
    }
    function received(event: Event) {
      const { origin } = (event as CustomEvent<{ origin?: CartOrigin }>).detail;
      if (timer.current) clearTimeout(timer.current);
      setVisible(true);
      timer.current = setTimeout(() => setVisible(false), 4000);
      const target = document.querySelector<HTMLElement>(".cart-trigger");
      const rect = target?.getBoundingClientRect();
      const reduced = motion.matches;
      if (!target || !rect || rect.bottom < 0 || rect.top > innerHeight) return;
      const bump = () => {
        if (reduced) return;
        const badge = target.querySelector(".cart-count") ?? target;
        if (typeof badge.animate !== "function" || motion.matches) return;
        const animation = badge.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.6)", offset: 0.4 },
            { transform: "scale(1)" },
          ],
          { duration: 500, easing: "cubic-bezier(.3,1.6,.5,1)" },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      };
      if (reduced || !origin || typeof target.animate !== "function") {
        bump();
        return;
      }
      // Limit simultaneous decoration; purchases and quantities never wait for it.
      if (particles.size >= 3) return;
      const dot = document.createElement("div");
      dot.className = "cart-fly-dot";
      dot.setAttribute("aria-hidden", "true");
      (document.querySelector("dialog[open]") ?? document.body).appendChild(
        dot,
      );
      particles.add(dot);
      const sx = origin.left + origin.width / 2;
      const sy = origin.top + origin.height / 2;
      const ex = rect.left + rect.width / 2;
      const ey = rect.top + rect.height / 2;
      const animation = dot.animate(
        [
          { transform: `translate(${sx}px,${sy}px) scale(1)`, opacity: 1 },
          {
            transform: `translate(${(sx + ex) / 2}px,${Math.min(sy, ey) - 120}px) scale(1.4)`,
            opacity: 1,
            offset: 0.5,
          },
          { transform: `translate(${ex}px,${ey}px) scale(.3)`, opacity: 0.2 },
        ],
        { duration: 800, easing: "cubic-bezier(.5,0,.3,1)" },
      );
      animations.add(animation);
      animation.onfinish = () => {
        dot.remove();
        particles.delete(dot);
        animations.delete(animation);
        bump();
      };
    }
    window.addEventListener(eventName, received);
    motion.addEventListener("change", stopMotion);
    return () => {
      window.removeEventListener(eventName, received);
      motion.removeEventListener("change", stopMotion);
      if (timer.current) clearTimeout(timer.current);
      for (const animation of animations) animation.cancel();
      for (const particle of particles) particle.remove();
    };
  }, []);

  return (
    <div className="cart-arrival" aria-live="polite" data-visible={visible}>
      {visible && (
        <>
          <span>Agregado a tu bolsa</span>
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              open.current();
            }}
            onFocus={() => {
              if (timer.current) clearTimeout(timer.current);
            }}
            onBlur={() => {
              timer.current = setTimeout(() => setVisible(false), 4000);
            }}
          >
            Ver bolsa →
          </button>
        </>
      )}
    </div>
  );
}
