"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { flavorMotion as m, type FlavorChange } from "./flavor-motion";

export function useFlavorDetailsMotion(
  root: RefObject<HTMLDivElement | null>,
  activeId: string,
  enabled: boolean,
  change: FlavorChange | null,
) {
  const chipGeometry = useRef(new Map<HTMLElement, {
    x: number; y: number; width: number; height: number;
  }>());
  const previous = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  useLayoutEffect(() => {
    if (!enabled || !root.current) return;
    const options = root.current.querySelector<HTMLElement>(
      ".gainer-flavor-options",
    );
    const indicator = options?.querySelector<HTMLElement>(
      ".flavor-chip-indicator",
    );
    const selected = options?.querySelector<HTMLElement>(
      '[aria-current="true"]',
    );
    if (!options || !indicator || !selected) return;
    let animation: Animation | undefined;
    const position = (animate: boolean, refresh = false) => {
      if (refresh || !chipGeometry.current.has(selected)) {
        const parent = options.getBoundingClientRect();
        const measured = new Map<HTMLElement, {
          x: number; y: number; width: number; height: number;
        }>();
        for (const chip of options.querySelectorAll<HTMLElement>("a")) {
          const box = chip.getBoundingClientRect();
          measured.set(chip, {
            x: box.left - parent.left, y: box.top - parent.top,
            width: box.width, height: box.height,
          });
        }
        chipGeometry.current = measured;
      }
      const next = chipGeometry.current.get(selected);
      if (!next) return;
      const old = previous.current;
      indicator.style.width = `${next.width}px`;
      indicator.style.height = `${next.height}px`;
      indicator.style.transform = `translate(${next.x}px, ${next.y}px)`;
      indicator.style.opacity = "1";
      if (animate && old && change?.mode === "full") {
        indicator.style.willChange = "transform";
        animation = indicator.animate(
          [
            {
              transform: `translate(${old.x}px, ${old.y}px) scale(${old.width / next.width}, ${old.height / next.height})`,
            },
            { transform: `translate(${next.x}px, ${next.y}px) scale(1, 1)` },
          ],
          { duration: m.chip, easing: m.easing.chip },
        );
        void animation.finished
          .finally(() => {
            indicator.style.willChange = "";
          })
          .catch(() => {});
      }
      previous.current = next;
    };
    position(true);
    // Cache all chips together after resize/font changes; a selection only
    // writes the indicator instead of forcing layout between scene animations.
    const observer = new ResizeObserver(() => position(false, true));
    observer.observe(options);
    for (const chip of options.querySelectorAll("a")) observer.observe(chip);
    return () => {
      if (animation?.playState === "running") {
        const matrix = new DOMMatrixReadOnly(
          getComputedStyle(indicator).transform,
        );
        previous.current = {
          x: matrix.m41,
          y: matrix.m42,
          width: indicator.offsetWidth * matrix.a,
          height: indicator.offsetHeight * matrix.d,
        };
      }
      animation?.cancel();
      observer.disconnect();
      indicator.style.willChange = "";
    };
  }, [activeId, enabled, change, root]);

  useLayoutEffect(() => {
    if (!enabled || !change || !root.current) return;
    const node = root.current;
    const animations: Animation[] = [];
    const elements = [
      ".variant-spinner-caption",
      ".gainer-stock",
      ".transfer-pricing",
    ];
    for (const [index, selector] of elements.entries()) {
      const element = root.current.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const full = change.mode === "full";
      const delay = full ? m.textDelay + index * m.textStagger : 0;
      element.style.willChange = full ? "transform, opacity" : "opacity";
      const animation = element.animate(
        full
          ? [
              { opacity: 0, transform: `translateY(${m.textDistance}px)` },
              { opacity: 1, transform: "translateY(0px)" },
            ]
          : [{ opacity: 0.6 }, { opacity: 1 }],
        {
          duration: full
            ? m.textEnd - delay
            : change.mode === "reduced"
              ? m.reduced
              : m.simple,
          delay,
          easing: m.easing.enter,
          fill: "backwards",
        },
      );
      animations.push(animation);
      void animation.finished
        .finally(() => {
          element.style.willChange = "";
        })
        .catch(() => {});
    }
    for (const element of root.current.querySelectorAll<HTMLElement>(
      ".flavor-motion-accent",
    )) {
      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration:
          change.mode === "reduced"
            ? m.reduced
            : element.classList.contains("flavor-button-accent")
              ? m.button
              : m.accent,
        easing: m.easing.fade,
      });
      animations.push(animation);
    }
    return () => {
      animations.forEach((animation) => animation.cancel());
      elements.forEach((selector) => {
        const element = node.querySelector<HTMLElement>(selector);
        if (element) element.style.willChange = "";
      });
    };
  }, [change, enabled, root]);
}
