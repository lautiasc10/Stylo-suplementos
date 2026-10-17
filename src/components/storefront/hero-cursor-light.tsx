"use client";

import { useEffect, useRef, type RefObject } from "react";

/** One cached radial texture, moved by the compositor. No React updates per frame. */
export function HeroCursorLight({
  containerRef,
  enabled,
}: {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}) {
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = containerRef.current;
    const light = lightRef.current;
    if (!enabled || !scene || !light) return;
    let bounds = scene.getBoundingClientRect();
    let radius = light.offsetWidth / 2;
    let frame: number | null = null;
    let previousTime = 0;
    let x = bounds.width * 0.5;
    let y = bounds.height * 0.4;
    let targetX = x;
    let targetY = y;

    function draw(now: number) {
      frame = null;
      const dt = previousTime ? Math.min(now - previousTime, 50) : 16.7;
      previousTime = now;
      const ease = 1 - Math.exp(-dt / 85);
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      light!.style.transform = `translate3d(${x - radius}px, ${y - radius}px, 0)`;
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.4)
        frame = requestAnimationFrame(draw);
      else previousTime = 0;
    }
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse" || document.hidden) return;
      targetX = event.clientX - bounds.left;
      targetY = event.clientY - bounds.top;
      const inside =
        targetX >= 0 &&
        targetX <= bounds.width &&
        targetY >= 0 &&
        targetY <= bounds.height;
      light!.dataset.active = String(inside);
      if (inside && frame === null) frame = requestAnimationFrame(draw);
    }
    function hide() {
      light!.dataset.active = "false";
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = 0;
    }
    function measure() {
      bounds = scene!.getBoundingClientRect();
      radius = light!.offsetWidth / 2;
      hide();
    }
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      hide();
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", measure);
      document.documentElement.removeEventListener("pointerleave", hide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [containerRef, enabled]);

  return (
    <div ref={lightRef} className="hero-cursor-light" aria-hidden="true" />
  );
}
