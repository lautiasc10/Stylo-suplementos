"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; angle: number; radius: number; size: number };

/** One decorative canvas for the public storefront, adapted from the owner's Lovable reference. */
export function StoreParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canvas || reduced.matches) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const gold = getComputedStyle(document.documentElement).getPropertyValue("--gold").trim() || "#e5b858";

    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let phase = 0;
    let visible = !document.hidden;
    let particles: Particle[] = [];
    const compact = window.matchMedia("(max-width: 700px)");

    function resize() {
      if (!canvas || !context) return;
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1600 / width, 900 / height);
      canvas.width = Math.ceil(width * ratio);
      canvas.height = Math.ceil(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: compact.matches ? 55 : 150 }, () => ({
        x: Math.random(),
        y: Math.random(),
        angle: Math.random() * Math.PI * 2,
        radius: 0.15 + Math.random() * 0.35,
        size: 0.4 + Math.random() * 1.3,
      }));
    }

    function paint(timestamp: number) {
      frame = 0;
      if (!visible || !context) return;
      const elapsed = previous ? Math.min(timestamp - previous, 50) : 16.7;
      previous = timestamp;
      phase += elapsed * 0.00024;
      const convergence = (Math.sin(phase) + 1) / 2;
      context.clearRect(0, 0, width, height);
      context.fillStyle = gold;
      for (const particle of particles) {
        const centerX = width / 2 + Math.cos(particle.angle + phase) * particle.radius * width * 0.35 * convergence;
        const centerY = height / 2 + Math.sin(particle.angle + phase) * particle.radius * height * 0.6 * convergence;
        const x = particle.x * width * (1 - convergence) + centerX * convergence;
        const y = particle.y * height * (1 - convergence) + centerY * convergence;
        context.globalAlpha = 0.35 + convergence * 0.5;
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(paint);
    }

    function sync() {
      visible = !document.hidden && !reduced.matches && !document.querySelector("dialog[open]");
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      } else if (visible && !frame) frame = requestAnimationFrame(paint);
      if (reduced.matches) context?.clearRect(0, 0, width, height);
    }

    const dialogs = new MutationObserver(sync);
    resize();
    sync();
    dialogs.observe(document.body, { attributes: true, attributeFilter: ["open"], subtree: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      dialogs.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  return <canvas ref={canvasRef} className="store-particles" aria-hidden="true" />;
}
