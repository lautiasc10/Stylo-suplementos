"use client";

import { useEffect, useState } from "react";

type Ingredient = "banana" | "frutilla" | "vainilla";
const decodedIngredients = new Set<Ingredient>();

export function flavorIngredient(flavor?: string): Ingredient | null {
  const value =
    flavor
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase() ?? "";
  const matches: Ingredient[] = [];
  if (/\bbanana\b/.test(value)) matches.push("banana");
  if (/\b(frutilla|fresa|strawberry)\b/.test(value)) matches.push("frutilla");
  if (/\b(vainilla|vanilla)\b/.test(value)) matches.push("vainilla");
  return matches.length === 1 ? matches[0] : null;
}

export const ingredientSource = (ingredient: Ingredient) =>
  `/sabores/${ingredient}-decor-v1.webp`;

function IngredientLayer({
  ingredient,
  outgoing = false,
  sequence,
}: {
  ingredient: Ingredient;
  outgoing?: boolean;
  sequence: number;
}) {
  const [ready, setReady] = useState(() => decodedIngredients.has(ingredient));
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="flavor-ingredient-layer"
      data-flavor={ingredient}
      data-outgoing={outgoing || undefined}
      data-ready={(ready && !failed) || undefined}
      data-sequence={sequence}
    >
      {(["left", "right", "ground"] as const).map((side) => (
        <span key={side} className="flavor-ingredient-piece" data-side={side}>
          <img
            src={ingredientSource(ingredient)}
            alt=""
            width={768}
            height={512}
            loading="lazy"
            decoding="async"
            onLoad={async (event) => {
              try {
                await event.currentTarget.decode();
                decodedIngredients.add(ingredient);
                setReady(true);
              } catch {
                setFailed(true);
              }
            }}
            onError={() => setFailed(true)}
          />
        </span>
      ))}
    </div>
  );
}

// This controller lives in the card/detail parent, so a gallery reset keeps the exit layer.
export function useFlavorIngredients(flavor?: string) {
  const wanted = flavorIngredient(flavor);
  const [enhanced, setEnhanced] = useState(false);
  const [motion, setMotion] = useState(false);
  const [layers, setLayers] = useState<{
    current: Ingredient | null;
    previous: Ingredient | null;
    sequence: number;
  }>({
    current: wanted,
    previous: null,
    sequence: 0,
  });
  useEffect(() => {
    setEnhanced(true);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setLayers((last) =>
      last.current === wanted
        ? !motion && last.previous
          ? { ...last, previous: null }
          : last
        : {
            current: wanted,
            previous: motion ? last.current : null,
            sequence: last.sequence + 1,
          },
    );
  }, [wanted, motion]);
  useEffect(() => {
    if (!layers.previous) return;
    const timeout = window.setTimeout(
      () => setLayers((last) => ({ ...last, previous: null })),
      850,
    );
    return () => window.clearTimeout(timeout);
  }, [layers.previous, layers.sequence]);

  if (!enhanced || (!layers.current && !layers.previous)) return null;
  return (
    <div
      className="flavor-ingredients"
      aria-hidden="true"
      data-motion={motion || undefined}
    >
      {layers.previous && (
        <IngredientLayer
          key={layers.previous}
          ingredient={layers.previous}
          outgoing
          sequence={layers.sequence}
        />
      )}
      {layers.current && (
        <IngredientLayer
          key={layers.current}
          ingredient={layers.current}
          sequence={layers.sequence}
        />
      )}
    </div>
  );
}
