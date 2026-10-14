"use client";

import { useEffect, useRef, useState } from "react";

export type SceneFlavor = "banana" | "frutilla" | "vainilla";
export function sceneFlavor(flavor: string): SceneFlavor | null {
  const normalized = flavor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const matches = [
    [/\bbanana\b/, "banana"],
    [/\b(frutilla|fresa|strawberry)\b/, "frutilla"],
    [/\b(vainilla|vanilla)\b/, "vainilla"],
  ] as const;
  const found = matches.filter(([pattern]) => pattern.test(normalized));
  return found.length === 1 ? found[0][1] : null;
}
export const sceneIngredient = (flavor: SceneFlavor) =>
  `/sabores/${flavor}-decor-v1.webp`;

function IngredientLayer({
  flavor,
  outgoing,
}: {
  flavor: SceneFlavor;
  outgoing: boolean;
}) {
  const [ready, setReady] = useState(false);
  return (
    <div
      className="flavor-scene-layer"
      data-flavor={flavor}
      data-outgoing={outgoing ? "true" : undefined}
      data-ready={ready ? "true" : undefined}
    >
      {["hero", "left", "right", "bottom"].map((place) => (
        <div key={place} className="flavor-scene-piece" data-place={place}>
          <img
            src={sceneIngredient(flavor)}
            alt=""
            width={768}
            height={512}
            decoding="async"
            fetchPriority="low"
            onLoad={() => setReady(true)}
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function FlavorSceneDecorations({
  flavor,
}: {
  flavor: SceneFlavor | null;
}) {
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [layers, setLayers] = useState<{
    current: SceneFlavor | null;
    previous: SceneFlavor | null;
  }>({ current: flavor, previous: null });
  useEffect(() => {
    setEnhanced(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!enhanced) return;
    const update = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    const observer = window.IntersectionObserver
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
      : null;
    if (observer && root.current) observer.observe(root.current);
    else setVisible(true);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [enhanced]);
  useEffect(() => {
    setLayers((old) =>
      old.current === flavor && !reduced
        ? old
        : {
            current: flavor,
            previous: reduced
              ? null
              : old.current === flavor
                ? null
                : old.current,
          },
    );
  }, [flavor, reduced]);
  useEffect(() => {
    if (!layers.previous) return;
    const timer = setTimeout(
      () => setLayers((old) => ({ ...old, previous: null })),
      650,
    );
    return () => clearTimeout(timer);
  }, [layers]);
  if (!enhanced) return null;
  return (
    <div
      ref={root}
      className="flavor-scene-decorations"
      aria-hidden="true"
      data-motion={!reduced ? "true" : undefined}
      data-playing={!reduced && visible && documentVisible ? "true" : undefined}
    >
      {[layers.previous, layers.current]
        .filter((value): value is SceneFlavor => value !== null)
        .map((value) => (
          <div
            key={`surface:${value}`}
            className="flavor-scene-surface"
            data-flavor={value}
            data-outgoing={value === layers.previous ? "true" : undefined}
          />
        ))}
      {[layers.previous, layers.current]
        .filter((value): value is SceneFlavor => value !== null)
        .map((value) => (
          <IngredientLayer
            key={value}
            flavor={value}
            outgoing={value === layers.previous}
          />
        ))}
    </div>
  );
}
