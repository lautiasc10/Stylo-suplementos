"use client";

import { useEffect, useState } from "react";

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
        <img
          key={place}
          className="flavor-scene-piece"
          data-place={place}
          src={sceneIngredient(flavor)}
          alt=""
          width={768}
          height={512}
          decoding="async"
          onLoad={() => setReady(true)}
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
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
      900,
    );
    return () => clearTimeout(timer);
  }, [layers]);
  if (!enhanced) return null;
  return (
    <div
      className="flavor-scene-decorations"
      aria-hidden="true"
      data-motion={!reduced ? "true" : undefined}
    >
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
