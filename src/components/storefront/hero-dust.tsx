"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "@/components/ui/icon";

type Mote = { x: number; y: number; depth: number; phase: number };

export function HeroDust({
  containerRef,
  enabled,
  variant = "hero",
}: {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  variant?: "hero" | "menu";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const updatePlayback = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    if (variant !== "menu") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 801px) and (hover: hover)");
    function update() {
      setMotionAllowed(
        !media.matches &&
          desktop.matches &&
          !(navigator as Navigator & { connection?: { saveData?: boolean } })
            .connection?.saveData,
      );
    }
    update();
    media.addEventListener("change", update);
    desktop.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
    };
  }, [variant]);
  const running = enabled && (variant === "hero" || motionAllowed);

  useEffect(() => {
    pausedRef.current = paused;
    updatePlayback.current();
  }, [paused]);

  useEffect(() => {
    if (!running) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!container || !canvas || !context) return;
    const surface: HTMLCanvasElement = canvas;
    const ctx: CanvasRenderingContext2D = context;
    const scene: HTMLElement = container;
    const motes: Mote[] = [];
    const clouds: Mote[] = [];
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

    // Cached dust and haze textures. Their opacity and footprint are separate:
    // the previous tiny, translucent grains became invisible on black.
    const grain = document.createElement("canvas");
    grain.width = grain.height = 40;
    const grainContext = grain.getContext("2d");
    if (!grainContext) return;
    const token = getComputedStyle(scene).getPropertyValue("--gold").trim();
    const hex = /^#[0-9a-f]{6}$/i.test(token) ? token : "#d8b474";
    const rgb = [1, 3, 5]
      .map((start) => parseInt(hex.slice(start, start + 2), 16))
      .join(",");
    const glow = grainContext.createRadialGradient(20, 20, 0, 20, 20, 18);
    glow.addColorStop(0, `rgba(${rgb},1)`);
    glow.addColorStop(0.12, `rgba(${rgb},.8)`);
    glow.addColorStop(0.35, `rgba(${rgb},.18)`);
    glow.addColorStop(1, `rgba(${rgb},0)`);
    grainContext.fillStyle = glow;
    grainContext.fillRect(0, 0, 40, 40);
    for (let i = 0; i < 8; i++) {
      grainContext.fillStyle = `rgba(${rgb},${0.35 + random() * 0.5})`;
      const radius = 0.6 + random() * 0.8;
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

    const haze = document.createElement("canvas");
    haze.width = 192;
    haze.height = 128;
    const hazeContext = haze.getContext("2d");
    if (!hazeContext) return;
    for (let i = 0; i < 28; i++) {
      const x = 38 + random() * 116;
      const y = 34 + random() * 60;
      const radius = 15 + random() * 23;
      const patch = hazeContext.createRadialGradient(x, y, 0, x, y, radius);
      patch.addColorStop(0, `rgba(${rgb},.12)`);
      patch.addColorStop(0.5, `rgba(${rgb},.045)`);
      patch.addColorStop(1, `rgba(${rgb},0)`);
      hazeContext.fillStyle = patch;
      hazeContext.fillRect(0, 0, 192, 128);
    }
    const cloudCount = variant === "menu" ? 8 : 16;
    for (let i = 0; i < cloudCount; i++)
      clouds.push({
        x: (i % 4) / 4 + random() * 0.2,
        y: Math.floor(i / 4) / (cloudCount / 4) + random() * 0.2,
        depth: random(),
        phase: random() * Math.PI * 2,
      });

    function protection(x: number, y: number) {
      if (variant === "menu") return 0.6;
      const dx = Math.max(copy.left - x, 0, x - copy.right);
      const dy = Math.max(copy.top - y, 0, y - copy.bottom);
      const copyWeight = 0.16 + 0.84 * Math.min(1, Math.hypot(dx, dy) / 70);
      const faceDistance =
        ((x - width * 0.7) / (width * 0.18)) ** 2 +
        ((y - height * 0.42) / (height * 0.3)) ** 2;
      const faceWeight = 0.08 + 0.92 * Math.min(1, faceDistance);
      return copyWeight * faceWeight;
    }

    function paint(dt: number) {
      if (!width || !height) return;
      motionTime += dt;
      ctx.clearRect(0, 0, width, height);
      for (const cloud of clouds) {
        cloud.x += ((4 + cloud.depth * 5) * dt) / width;
        cloud.y -= ((2 + cloud.depth * 3) * dt) / height;
        const size = Math.min(width * (0.3 + cloud.depth * 0.18), 700);
        const marginX = (size / 2 + 24) / width;
        const marginY = (size / 3 + 16) / height;
        // Large patches wrap only once their entire footprint is offscreen.
        if (cloud.x > 1 + marginX) cloud.x = -marginX;
        if (cloud.y < -marginY) cloud.y = 1 + marginY;
        const x =
          cloud.x * width + Math.sin(motionTime * 0.12 + cloud.phase) * 24;
        const y =
          cloud.y * height + Math.cos(motionTime * 0.1 + cloud.phase) * 16;
        ctx.globalAlpha = (0.18 + cloud.depth * 0.16) * protection(x, y);
        ctx.drawImage(haze, x - size / 2, y - size / 3, size, (size * 2) / 3);
      }
      for (const mote of motes) {
        mote.x +=
          ((7 +
            mote.depth * 14 +
            Math.sin(motionTime * 0.18 + mote.phase) * 3) *
            dt) /
          width;
        mote.y -= ((3 + mote.depth * 7) * dt) / height;
        if (mote.x > 1.03) mote.x = -0.03;
        if (mote.y < -0.03) mote.y = 1.03;
        const x =
          mote.x * width +
          Math.sin(motionTime * 0.23 + mote.phase) * 16 * mote.depth;
        const y =
          mote.y * height + Math.cos(motionTime * 0.18 + mote.phase) * 8;
        const size = 3.5 + mote.depth * 6;
        ctx.globalAlpha = (0.5 + mote.depth * 0.4) * protection(x, y);
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
        variant === "menu" ? 180 : 440,
        Math.max(
          variant === "menu" ? 70 : 220,
          Math.round((width * height) / 3600),
        ),
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
  }, [containerRef, running, variant]);

  const label =
    variant === "menu"
      ? paused
        ? "Reanudar partículas de categorías"
        : "Pausar partículas de categorías"
      : paused
        ? "Reanudar polvo del fondo"
        : "Pausar polvo del fondo";
  return (
    <>
      <div
        className={variant === "menu" ? "category-dust" : "hero-dust"}
        data-visible={running}
        aria-hidden="true"
      >
        {running && <canvas ref={canvasRef} />}
      </div>
      {running && (
        <button
          type="button"
          className={`hero-dust-control${variant === "menu" ? " category-dust-control" : ""}`}
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
