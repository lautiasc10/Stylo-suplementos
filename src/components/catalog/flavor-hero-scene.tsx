"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMotionPreference } from "@/components/ui/use-motion-preference";
import { IngredientLayer } from "./flavor-scene";
import type { SceneFlavor } from "@/modules/catalog/flavor-scenes";
import {
  flavorDuration,
  flavorMotion as m,
  revealGeometry,
  type FlavorChange,
} from "./flavor-motion";

/** Each scene owns its color, ingredients and readability veil. Clipping the
 * assembled scene avoids revealing the new color behind the old ingredients. */
export function FlavorHeroScene({
  flavor,
  previousFlavor,
  change,
}: {
  flavor: SceneFlavor | null;
  previousFlavor: SceneFlavor | null;
  change: FlavorChange | null;
}) {
  const root = useRef<HTMLDivElement>(null);
  const incoming = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [expired, setExpired] = useState<number | null>(null);
  const [ambientReady, setAmbientReady] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const reduced = useMotionPreference();
  const hasPrevious = Boolean(
    change && expired !== change.token && previousFlavor !== flavor,
  );

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    if (!window.IntersectionObserver) {
      setVisible(true);
      return () => document.removeEventListener("visibilitychange", updateVisibility);
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    const detail = element?.closest(".product-detail");
    const copy = detail?.querySelector(".product-detail-copy");
    if (!element || !copy) return;
    const positionVeil = () => {
      const scene = element.getBoundingClientRect(),
        info = copy.getBoundingClientRect();
      element.style.setProperty(
        "--flavor-copy-x",
        `${info.left - scene.left - 64}px`,
      );
      element.style.setProperty(
        "--flavor-copy-y",
        `${info.top - scene.top - 80}px`,
      );
      element.style.setProperty("--flavor-copy-width", `${info.width + 128}px`);
      element.style.setProperty(
        "--flavor-copy-height",
        `${info.height + 160}px`,
      );
    };
    positionVeil();
    const observer = new ResizeObserver(positionVeil);
    observer.observe(element);
    observer.observe(copy);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const layer = incoming.current,
      inner = content.current,
      element = root.current;
    if (!change || previousFlavor === flavor || !layer || !inner || !element)
      return;
    const animations: Animation[] = [];
    const full =
      change.mode === "full" &&
      CSS.supports("clip-path", "circle(10px at 50% 50%)");
    const outgoing = element.querySelector<HTMLElement>(
      ".flavor-hero-background[data-outgoing]",
    );
    // Cache the assembled old scene as one compositor surface as well. Without
    // this hint a changing clip can repeatedly repaint its large ingredients.
    if (outgoing && full) outgoing.style.willChange = "transform";
    const bounds = element.getBoundingClientRect();
    const { x, y, radius } = revealGeometry(
      bounds.width,
      bounds.height,
      change.point,
    );
    layer.style.willChange = full ? "clip-path, opacity" : "opacity";
    const reveal = layer.animate(
      full
        ? [
            { clipPath: `circle(0px at ${x}px ${y}px)` },
            { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
          ]
        : [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: full ? m.background : flavorDuration(change),
        easing: full ? m.easing.background : m.easing.fade,
        fill: "both",
      },
    );
    animations.push(reveal);
    if (full) {
      // The short opacity overlap softens the cut at the reveal's origin and
      // also provides a visual fallback while the clip surface is promoted.
      animations.push(
        layer.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: m.backgroundCrossfade,
          easing: m.easing.fade,
          fill: "both",
        }),
      );
    }
    void reveal.finished
      .then(() => {
        layer.style.willChange = "";
        if (outgoing) outgoing.style.willChange = "";
        setExpired(change.token);
        if (full) setAmbientReady(change.token);
      })
      .catch(() => {});
    if (full) {
      inner.style.willChange = "transform";
      const depth = inner.animate(
        [
          { transform: `scale(${m.backgroundFromScale})` },
          { transform: "scale(1)" },
        ],
        { duration: m.backgroundScale, easing: m.easing.enter, fill: "both" },
      );
      animations.push(depth);
      void depth.finished
        .then(() => {
          inner.style.willChange = "";
        })
        .catch(() => {});
    }
    return () => {
      animations.forEach((animation) => animation.cancel());
      layer.style.willChange = inner.style.willChange = "";
      if (outgoing) outgoing.style.willChange = "";
    };
  }, [change, flavor, previousFlavor]);

  const layers = hasPrevious ? [previousFlavor, flavor] : [flavor];
  return (
    <div
      ref={root}
      className="flavor-scene-decorations flavor-hero-scenes"
      aria-hidden="true"
      data-ambient={
        !reduced && change && ambientReady === change.token && !hasPrevious
          ? "true"
          : undefined
      }
      data-playing={visible && documentVisible ? "true" : undefined}
    >
      {layers.map((value, index) => {
        const active = index === layers.length - 1;
        return (
          <div
            key={value ?? "neutral"}
            ref={active ? incoming : undefined}
            className="flavor-scene-surface flavor-hero-background"
            data-flavor={value ?? "neutral"}
            data-outgoing={!active || undefined}
            data-current={active || undefined}
          >
            <div
              ref={active ? content : undefined}
              className="flavor-hero-background-content"
            >
              {value && <IngredientLayer flavor={value} outgoing={!active} />}
              <div className="flavor-hero-readability" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
