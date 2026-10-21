"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Observe one purchase bar, never pointer/scroll events or React state. */
export function usePurchaseBarSpace(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const bar = root.current?.querySelector<HTMLElement>(".purchase-action");
    if (!bar) return;
    const style = document.documentElement.style;
    const previous = style.getPropertyValue("--purchase-bar-height");
    const priority = style.getPropertyPriority("--purchase-bar-height");
    const mobile = matchMedia("(max-width: 959px) and (min-height: 501px)");
    let frame: number | null = null;
    function sync() {
      frame = null;
      if (mobile.matches)
        style.setProperty(
          "--purchase-bar-height",
          `${Math.ceil(bar!.getBoundingClientRect().height)}px`,
        );
      else style.removeProperty("--purchase-bar-height");
    }
    function schedule() {
      if (frame === null) frame = requestAnimationFrame(sync);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(bar);
    mobile.addEventListener("change", schedule);
    sync();
    return () => {
      observer.disconnect();
      mobile.removeEventListener("change", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
      if (previous)
        style.setProperty("--purchase-bar-height", previous, priority);
      else style.removeProperty("--purchase-bar-height");
    };
  }, [root]);
}
