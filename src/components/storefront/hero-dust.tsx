"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "@/components/ui/icon";

type Mote = { x: number; y: number; depth: number; phase: number };

export function HeroDust({
  containerRef,
  enabled,
}: {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const updatePlayback = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    updatePlayback.current();
  }, [paused]);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!container || !canvas || !context) return;
    const surface: HTMLCanvasElement = canvas;
    const ctx: CanvasRenderingContext2D = context;
    const scene: HTMLElement = container;
    const motes: Mote[] = [];
    let width = 0;
    let height = 0;
    let inView = false;
    let frame: number | null = null;
    let lastDraw = 0;
    let motionTime = 0;
    let disposed = false;
    let copy = { left: 0, top: 0, right: 0, bottom: 0 };
    let seed = 3032;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    // One tiny cached grain texture; no per-frame gradients, filters, images,
    // video decoders or arrays of full-screen frames.
    const grain = document.createElement("canvas");
    grain.width = grain.height = 40;
    const grainContext = grain.getContext("2d");
    if (!grainContext) return;
    const token = getComputedStyle(scene).getPropertyValue("--gold").trim();
    const hex = /^#[0-9a-f]{6}$/i.test(token) ? token : "#d8b474";
    const rgb = [1, 3, 5]
      .map((start) => parseInt(hex.slice(start, start + 2), 16))
      .join(",");
    const glow = grainContext.createRadialGradient(20, 20, 0, 20, 20, 8);
    glow.addColorStop(0, `rgba(${rgb},.72)`);
    glow.addColorStop(0.28, `rgba(${rgb},.42)`);
    glow.addColorStop(1, `rgba(${rgb},0)`);
    grainContext.fillStyle = glow;
    grainContext.fillRect(0, 0, 40, 40);
    for (let i = 0; i < 12; i++) {
      grainContext.fillStyle = `rgba(${rgb},${0.1 + random() * 0.35})`;
      const radius = 0.3 + random() * 0.65;
      grainContext.beginPath();
      grainContext.arc(
        8 + random() * 24,
        8 + random() * 24,
        radius,
        0,
        Math.PI * 2,
      );
      grainContext.fill();
    }

    function paint(dt: number) {
      if (!width || !height) return;
      motionTime += dt;
      ctx.clearRect(0, 0, width, height);
      for (const mote of motes) {
        mote.x +=
          ((2 +
            mote.depth * 7 +
            Math.sin(motionTime * 0.09 + mote.phase) * 1.5) *
            dt) /
          width;
        mote.y -= ((1 + mote.depth * 4) * dt) / height;
        if (mote.x > 1.03) mote.x = -0.03;
        if (mote.y < -0.03) mote.y = 1.03;
        const x =
          mote.x * width +
          Math.sin(motionTime * 0.11 + mote.phase) * 6 * mote.depth;
        const y =
          mote.y * height + Math.cos(motionTime * 0.08 + mote.phase) * 3;
        const dx = Math.max(copy.left - x, 0, x - copy.right);
        const dy = Math.max(copy.top - y, 0, y - copy.bottom);
        const copyWeight = 0.18 + 0.82 * Math.min(1, Math.hypot(dx, dy) / 48);
        const faceDistance =
          ((x - width * 0.7) / (width * 0.16)) ** 2 +
          ((y - height * 0.42) / (height * 0.27)) ** 2;
        const faceWeight = 0.12 + 0.88 * Math.min(1, faceDistance);
        const size = 3 + mote.depth * 8;
        ctx.globalAlpha = (0.18 + mote.depth * 0.28) * copyWeight * faceWeight;
        ctx.drawImage(grain, x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    function resize() {
      width = scene.clientWidth;
      height = scene.clientHeight;
      if (!width || !height) return;
      // Cap the surface independently of display DPR, including 4K monitors.
      const scale = Math.min(
        window.devicePixelRatio || 1,
        1.25,
        1920 / width,
        1080 / height,
      );
      surface.width = Math.ceil(width * scale);
      surface.height = Math.ceil(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const origin = scene.getBoundingClientRect();
      const bounds = scene
        .querySelector(".hero-content")
        ?.getBoundingClientRect();
      if (bounds)
        copy = {
          left: bounds.left - origin.left - 12,
          right: bounds.right - origin.left + 12,
          top: bounds.top - origin.top - 12,
          bottom: bounds.bottom - origin.top + 12,
        };
      const count = Math.min(
        120,
        Math.max(50, Math.round((width * height) / 11000)),
      );
      while (motes.length < count)
        motes.push({
          x: random(),
          y: random(),
          depth: random(),
          phase: random() * Math.PI * 2,
        });
      motes.length = count;
      paint(0);
    }

    function tick(now: number) {
      frame = null;
      if (disposed || !inView || document.hidden || pausedRef.current) return;
      if (!lastDraw || now - lastDraw >= 1000 / 30) {
        const dt = lastDraw ? Math.min((now - lastDraw) / 1000, 0.067) : 0;
        lastDraw = now;
        paint(dt);
      }
      frame = requestAnimationFrame(tick);
    }

    function syncPlayback() {
      const running = inView && !document.hidden && !pausedRef.current;
      if (!running) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        lastDraw = 0;
      } else if (frame === null) frame = requestAnimationFrame(tick);
    }

    updatePlayback.current = syncPlayback;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        inView = entry.intersectionRatio >= 0.15;
        syncPlayback();
      },
      { threshold: [0, 0.15] },
    );
    const dimensions = new ResizeObserver(resize);
    dimensions.observe(scene);
    visibility.observe(scene);
    document.addEventListener("visibilitychange", syncPlayback);
    resize();
    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      visibility.disconnect();
      dimensions.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      updatePlayback.current = () => {};
      ctx.clearRect(0, 0, width, height);
    };
  }, [containerRef, enabled]);

  const label = paused ? "Reanudar polvo del fondo" : "Pausar polvo del fondo";
  return (
    <>
      <div className="hero-dust" data-visible={enabled} aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
      {enabled && (
        <button
          type="button"
          className="hero-dust-control"
          aria-label={label}
          title={label}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          <Icon name={paused ? "play" : "pause"} />
        </button>
      )}
    </>
  );
}
