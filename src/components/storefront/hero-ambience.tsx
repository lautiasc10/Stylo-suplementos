"use client";

import { useEffect, useRef, type RefObject } from "react";

type Particle = {
  x: number;
  y: number;
  z: number;
  r: number;
  vy: number;
  a: number;
};

/** Adapted from the owner's LionHero.tsx. One clock for parallax, light and dust. */
export function HeroAmbience({
  containerRef,
  enabled,
  paused,
  onActivityChange,
}: {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  paused: boolean;
  onActivityChange: (active: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  useEffect(() => {
    const root = containerRef.current;
    const canvas = canvasRef.current;
    const light = lightRef.current;
    if (!enabled || !root || !canvas || !light) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const text = root.querySelector<HTMLElement>(".hero-title-parallax");
    const lion = root.querySelector<HTMLElement>(".hero-lion-tilt");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const target = { x: 0.5, y: 0.5 };
    const current = { ...target };
    let width = 0;
    let height = 0;
    let bounds = root.getBoundingClientRect();
    let inView = false;
    let frame: number | null = null;
    let previous = 0;
    let seed = 3032;
    const particles: Particle[] = [];
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    function paint(dt: number) {
      if (!width || !height) return;
      // Same 0.06 smoothing at 60 Hz, independent of the display frame rate.
      const ease = 1 - Math.exp(-dt / 0.2693);
      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      const dx = current.x - 0.5;
      const dy = current.y - 0.5;
      if (text)
        text.style.transform = `translate3d(${-30 * dx}px, ${-20 * dy}px, 0)`;
      if (lion)
        lion.style.transform = `rotateX(${-8 * dy}deg) rotateY(${10 * dx}deg)`;
      light!.style.transform = `translate3d(${current.x * width - 600}px, ${current.y * height - 600}px, 0)`;
      context!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.vy * p.z * dt * 60;
        p.a += dt * 0.6;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = random();
        }
        const x = (p.x + Math.sin(p.a) * 0.004) * width - dx * 60 * p.z;
        const y = p.y * height - dy * 40 * p.z;
        context!.globalAlpha = 0.25 + p.z * 0.55;
        context!.fillStyle = p.z > 0.7 ? "#f5d78a" : "#c8902f";
        context!.beginPath();
        context!.arc(x, y, p.r * p.z * 1.4, 0, Math.PI * 2);
        context!.fill();
      }
      context!.globalAlpha = 1;
    }
    function tick(now: number) {
      frame = null;
      if (!inView || document.hidden || pausedRef.current) return;
      paint(previous ? Math.min((now - previous) / 1000, 0.05) : 1 / 60);
      previous = now;
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      const active = inView && !document.hidden;
      onActivityChange(active);
      if (!active || pausedRef.current) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        previous = 0;
      } else if (frame === null) frame = requestAnimationFrame(tick);
    }
    function measure() {
      bounds = root!.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const scale = Math.min(
        devicePixelRatio || 1,
        1.5,
        1600 / width,
        1000 / height,
      );
      canvas!.width = Math.ceil(width * scale);
      canvas!.height = Math.ceil(height * scale);
      context!.setTransform(scale, 0, 0, scale, 0, 0);
      const count = fine.matches ? 90 : 35;
      while (particles.length < count)
        particles.push({
          x: random(),
          y: random(),
          z: random() * 0.8 + 0.2,
          r: random() * 1.6 + 0.3,
          vy: random() * 0.00025 + 0.00008,
          a: random() * Math.PI * 2,
        });
      particles.length = count;
      if (!fine.matches) target.x = target.y = 0.5;
      paint(0);
    }
    function move(event: PointerEvent) {
      if (
        !inView ||
        document.hidden ||
        pausedRef.current ||
        !fine.matches ||
        event.pointerType !== "mouse"
      )
        return;
      target.x = Math.max(
        0,
        Math.min(1, (event.clientX - bounds.left) / width),
      );
      target.y = Math.max(
        0,
        Math.min(1, (event.clientY - bounds.top) / height),
      );
      light!.dataset.active = "true";
    }
    function scroll() {
      bounds = root!.getBoundingClientRect();
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.intersectionRatio >= 0.15;
        sync();
      },
      { threshold: [0, 0.15] },
    );
    const resize = new ResizeObserver(measure);
    syncRef.current = sync;
    measure();
    resize.observe(root);
    observer.observe(root);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    fine.addEventListener("change", measure);
    document.addEventListener("visibilitychange", sync);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      syncRef.current = () => {};
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      fine.removeEventListener("change", measure);
      document.removeEventListener("visibilitychange", sync);
      if (text) text.style.transform = "";
      if (lion) lion.style.transform = "";
      light.style.transform = "";
    };
  }, [containerRef, enabled, onActivityChange]);

  return (
    <>
      <div ref={lightRef} className="hero-cursor-light" aria-hidden="true" />
      {enabled && (
        <div className="hero-dust" data-visible="true" aria-hidden="true">
          <canvas ref={canvasRef} />
        </div>
      )}
    </>
  );
}
