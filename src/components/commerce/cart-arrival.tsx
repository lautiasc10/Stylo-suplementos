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
    const markers = new Set<HTMLElement>();
    const flights = new Set<{
      dot: HTMLElement;
      animation: Animation;
      started: number;
      end: { x: number; y: number };
    }>();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let fallback: HTMLElement | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    function animate(
      node: HTMLElement,
      frames: Keyframe[],
      options: KeyframeAnimationOptions,
    ) {
      const animation = node.animate(frames, options);
      animations.add(animation);
      animation.addEventListener("finish", () => animations.delete(animation), {
        once: true,
      });
      animation.addEventListener("cancel", () => animations.delete(animation), {
        once: true,
      });
      return animation;
    }
    function mountDecoration(node: HTMLElement) {
      // A manual popover stays above modal dialogs without inheriting their
      // transforms. It is decorative and never captures focus or pointer input.
      if (typeof node.showPopover === "function") {
        node.setAttribute("popover", "manual");
        document.body.appendChild(node);
        node.showPopover();
      } else
        (document.querySelector("dialog[open]") ?? document.body).appendChild(
          node,
        );
    }
    function visibleBag() {
      const target = document.querySelector<HTMLElement>(
        ".site-header .cart-trigger",
      );
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.top < 0 ||
        rect.left < 0 ||
        rect.bottom > innerHeight ||
        rect.right > innerWidth ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0 ||
        target.closest("[inert]")
      )
        return null;
      const hit = document.elementFromPoint(x, y);
      return hit && target.contains(hit) ? { node: target, x, y } : null;
    }
    function fallbackBag() {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (!fallback) {
        fallback = document.createElement("div");
        fallback.className = "cart-flight-destination";
        fallback.setAttribute("aria-hidden", "true");
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("viewBox", "0 0 256 256");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "16");
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute(
          "d",
          "M64 32H192L224 80V224H32V80Z M32 80H224 M88 112V128A40 40 0 0 0 168 128V112",
        );
        svg.appendChild(path);
        fallback.appendChild(svg);
        mountDecoration(fallback);
        markers.add(fallback);
        animate(
          fallback,
          [
            { opacity: 0, transform: "scale(.85)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 160, easing: "ease-out" },
        );
      }
      const rect = fallback.getBoundingClientRect();
      return {
        node: fallback,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    function retireFallback() {
      if (!fallback || flights.size) return;
      fallbackTimer = setTimeout(() => {
        if (!fallback || flights.size) return;
        const node = fallback;
        fallback = null;
        const fade = animate(node, [{ opacity: 1 }, { opacity: 0 }], {
          duration: 250,
          easing: "ease-out",
        });
        fade.onfinish = () => {
          node.remove();
          markers.delete(node);
        };
      }, 550);
    }
    function bump(target: HTMLElement) {
      if (motion.matches || !target.isConnected) return;
      const badge = target.querySelector(".cart-count") ?? target;
      if (typeof badge.animate !== "function") return;
      animate(
        badge as HTMLElement,
        [
          { transform: "scale(1)" },
          { transform: "scale(1.6)", offset: 0.4 },
          { transform: "scale(1)" },
        ],
        { duration: 500, easing: "cubic-bezier(.3,1.6,.5,1)" },
      );
    }
    function stopMotion() {
      if (!motion.matches) return;
      for (const animation of animations) animation.cancel();
      for (const particle of particles) particle.remove();
      fallback?.remove();
      for (const marker of markers) marker.remove();
      markers.clear();
      fallback = null;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      flights.clear();
      animations.clear();
      particles.clear();
    }
    function finish(flight: {
      dot: HTMLElement;
      animation: Animation;
      started: number;
      end: { x: number; y: number };
    }) {
      flight.dot.remove();
      particles.delete(flight.dot);
      flights.delete(flight);
      const destination =
        visibleBag() ?? (fallback ? { node: fallback } : null);
      if (destination) bump(destination.node);
      retireFallback();
    }
    function reposition() {
      frame = 0;
      if (!flights.size || motion.matches) return;
      const destination = visibleBag() ?? fallbackBag();
      for (const flight of flights) {
        if (
          Math.hypot(
            destination.x - flight.end.x,
            destination.y - flight.end.y,
          ) < 2
        )
          continue;
        const current = getComputedStyle(flight.dot);
        const start = {
          transform: current.transform,
          opacity: current.opacity,
        };
        flight.animation.cancel();
        flight.end = destination;
        flight.animation = animate(
          flight.dot,
          [
            start,
            {
              transform: `translate(${destination.x}px,${destination.y}px) scale(.1)`,
              opacity: 0,
            },
          ],
          {
            duration: Math.max(120, 800 - (performance.now() - flight.started)),
            easing: "cubic-bezier(.2,.8,.3,1)",
          },
        );
        flight.animation.onfinish = () => finish(flight);
      }
    }
    function schedulePosition() {
      if (flights.size && !frame) frame = requestAnimationFrame(reposition);
    }
    function received(event: Event) {
      const { origin } =
        (event as CustomEvent<{ origin?: CartOrigin }>).detail ?? {};
      if (timer.current) clearTimeout(timer.current);
      setVisible(true);
      timer.current = setTimeout(() => setVisible(false), 4000);
      if (motion.matches || typeof HTMLElement.prototype.animate !== "function")
        return;
      const destination = visibleBag() ?? fallbackBag();
      if (
        !origin ||
        ![origin.left, origin.top, origin.width, origin.height].every(
          Number.isFinite,
        )
      ) {
        bump(destination.node);
        retireFallback();
        return;
      }
      // Limit simultaneous decoration; purchases and quantities never wait for it.
      if (particles.size >= 3) return;
      const dot = document.createElement("div");
      dot.className = "cart-fly-dot";
      dot.setAttribute("aria-hidden", "true");
      mountDecoration(dot);
      particles.add(dot);
      const sx = Math.max(
        12,
        Math.min(innerWidth - 12, origin.left + origin.width / 2),
      );
      const sy = Math.max(
        12,
        Math.min(innerHeight - 12, origin.top + origin.height / 2),
      );
      const { x: ex, y: ey } = destination;
      const animation = animate(
        dot,
        [
          { transform: `translate(${sx}px,${sy}px) scale(1)`, opacity: 1 },
          {
            transform: `translate(${(sx + ex) / 2}px,${Math.max(16, Math.min(sy, ey) - 120)}px) scale(1.4)`,
            opacity: 1,
            offset: 0.5,
          },
          {
            transform: `translate(${ex}px,${ey}px) scale(.3)`,
            opacity: 0.2,
            offset: 0.92,
          },
          { transform: `translate(${ex}px,${ey}px) scale(.1)`, opacity: 0 },
        ],
        { duration: 800, easing: "cubic-bezier(.5,0,.3,1)" },
      );
      const flight = {
        dot,
        animation,
        started: performance.now(),
        end: destination,
      };
      flights.add(flight);
      animation.onfinish = () => finish(flight);
    }
    window.addEventListener(eventName, received);
    window.addEventListener("scroll", schedulePosition, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", schedulePosition, { passive: true });
    motion.addEventListener("change", stopMotion);
    return () => {
      window.removeEventListener(eventName, received);
      window.removeEventListener("scroll", schedulePosition, true);
      window.removeEventListener("resize", schedulePosition);
      motion.removeEventListener("change", stopMotion);
      if (timer.current) clearTimeout(timer.current);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (frame) cancelAnimationFrame(frame);
      fallback?.remove();
      for (const marker of markers) marker.remove();
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
