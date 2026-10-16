"use client";

import { useEffect, useState, type RefObject } from "react";
import { HeroDust } from "@/components/storefront/hero-dust";
import { Crossfade } from "@/components/ui/Crossfade";
import { useMotionPreference } from "@/components/ui/use-motion-preference";

// Independent, genuinely transparent cutouts supplied by the store owner.
// An unsupported flavor keeps the dust backdrop without unrelated ingredients.
const ingredients = {
  banana: ["banana-rodaja-1.webp", "banana-rodaja-2.webp"],
  frutilla: ["frutilla-entera-1.webp", "frutilla-entera-2.webp"],
  vainilla: ["vainilla-flor-1.webp", "vainilla-vaina-1.webp"],
  cookies: ["galleta-trozo-1.webp", "galleta-trozo-2.webp"],
};

export function gainerIngredientKey(
  flavor: string,
): keyof typeof ingredients | null {
  const name = flavor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/cookies|cookie|galleta/.test(name)) return "cookies";
  if (/banana/.test(name)) return "banana";
  if (/frutilla|fresa/.test(name)) return "frutilla";
  if (/vainilla|vanilla/.test(name)) return "vainilla";
  return null;
}

export function GainerBackdrop({
  containerRef,
  flavor,
}: {
  containerRef: RefObject<HTMLElement | null>;
  flavor: string;
}) {
  const reduced = useMotionPreference();
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [saveData, setSaveData] = useState(true);
  useEffect(() => {
    const scene = containerRef.current;
    if (!scene) return;
    setSaveData(
      Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData,
      ),
    );
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    const update = () => setDocumentVisible(!document.hidden);
    update();
    observer.observe(scene);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [containerRef]);
  const ingredientKey = gainerIngredientKey(flavor);
  const sources = ingredientKey ? ingredients[ingredientKey] : [];
  return (
    <>
      <HeroDust
        containerRef={containerRef}
        enabled
        variant="product"
        onPauseChange={setPaused}
      />
      <div
        className="gainer-ingredients"
        data-moving={
          !reduced && !saveData && visible && documentVisible && !paused
        }
        data-ingredient={ingredientKey ?? "none"}
        aria-hidden="true"
      >
        <Crossfade valueKey={ingredientKey ?? "none"}>
          {sources.length > 0 &&
            Array.from({ length: 4 }, (_, index) => (
              <span
                className={`gainer-ingredient gainer-ingredient-${index + 1}`}
                key={index}
              >
                <img
                  src={`/sabores/${sources[index % sources.length]}`}
                  width={180}
                  height={180}
                  alt=""
                  decoding="async"
                />
              </span>
            ))}
        </Crossfade>
      </div>
    </>
  );
}
