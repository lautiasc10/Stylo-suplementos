"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent,
  type RefObject,
} from "react";

/** Decorative only: a single rAF writes CSS variables, never React state. */
export function useTilt(
  container: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  maxAngle: number,
) {
  const active = useRef(enabled);
  active.current = enabled;
  const frame = useRef(0);
  const bounds = useRef<DOMRect | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const latest = useRef({ x: 0, y: 0 });
  const pack = useRef<HTMLElement | null>(null);
  const shadow = useRef<HTMLElement | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reset = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    clearTimeout(idle.current);
    bounds.current = null;
    touch.current = null;
    const node = container.current;
    if (!node) return;
    node.dataset.tilting = "false";
    const activePack =
      pack.current ??
      node.querySelector<HTMLElement>(
        '[data-current="true"] .variant-ring-tilt',
      );
    activePack?.style.removeProperty("will-change");
    for (const [key, value] of Object.entries({
      "--rx": "0deg",
      "--ry": "0deg",
      "--mx": "0%",
      "--my": "0%",
      "--sx": "0px",
      "--sy": "0px",
    }))
      activePack?.style.setProperty(key, value);
    (
      shadow.current ?? node.querySelector<HTMLElement>(".variant-ring-shadow")
    )?.style.setProperty("transform", "translate3d(0px,0px,0)");
    pack.current = null;
    shadow.current = null;
  }, [container]);
  const move = (event: PointerEvent) => {
    if (
      !active.current ||
      !container.current ||
      (event.pointerType !== "mouse" && !touch.current)
    )
      return;
    if (
      !(event.target as Element).closest(".product-image-stage") ||
      (event.target as Element).closest("button")
    )
      return;
    if (
      touch.current &&
      Math.hypot(
        event.clientX - touch.current.x,
        event.clientY - touch.current.y,
      ) < 5
    )
      return;
    bounds.current ??= container.current.getBoundingClientRect();
    pack.current ??= container.current.querySelector<HTMLElement>(
      '[data-current="true"] .variant-ring-tilt',
    );
    shadow.current ??= container.current.querySelector<HTMLElement>(
      ".variant-ring-shadow",
    );
    latest.current = { x: event.clientX, y: event.clientY };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const node = container.current,
        box = bounds.current;
      if (!node || !box || !active.current) return;
      const x = Math.max(
        -1,
        Math.min(1, ((latest.current.x - box.left) / box.width) * 2 - 1),
      );
      const y = Math.max(
        -1,
        Math.min(1, ((latest.current.y - box.top) / box.height) * 2 - 1),
      );
      if (node.dataset.tilting !== "true") node.dataset.tilting = "true";
      pack.current?.style.setProperty("will-change", "transform");
      clearTimeout(idle.current);
      const movingPack = pack.current;
      idle.current = setTimeout(
        () => movingPack?.style.removeProperty("will-change"),
        160,
      );
      for (const [key, value] of Object.entries({
        "--rx": `${-y * maxAngle}deg`,
        "--ry": `${x * maxAngle}deg`,
        "--mx": `${x * 35}%`,
        "--my": `${y * 35}%`,
        "--sx": `${-x * 4}px`,
        "--sy": `${-y * 2}px`,
      }))
        pack.current?.style.setProperty(key, value);
      shadow.current?.style.setProperty(
        "transform",
        `translate3d(${-x * 4}px,${-y * 2}px,0)`,
      );
    });
  };
  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);
  useEffect(() => reset, [reset]);
  return {
    onPointerMove: move,
    onPointerEnter: () => {
      bounds.current = null;
    },
    onPointerLeave: reset,
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.isPrimary)
        touch.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent) => {
      if (event.pointerType !== "mouse") reset();
    },
    onPointerCancel: reset,
    reset,
  };
}
