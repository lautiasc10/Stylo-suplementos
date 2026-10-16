"use client";

import { useEffect, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { HeroDust } from "@/components/storefront/hero-dust";
import { useMotionPreference } from "@/components/ui/use-motion-preference";
import {
  gainerIngredientKey,
  gainerIngredientSources,
  type GainerIngredientKey,
} from "./gainer-ingredients";

const ease = [0.16, 1, 0.3, 1] as const;

/** A crossfade with at most one outgoing set, including rapid repeated clicks.
 * Motion owns entry/exit; each inner image owns its independently pausable idle.
 * Initial HTML stays visible, without depending on hydration to reveal assets. */
function IngredientLayers({
  ingredientKey,
  animate,
}: {
  ingredientKey: GainerIngredientKey | null;
  animate: boolean;
}) {
  const [visual, setVisual] = useState({
    key: ingredientKey,
    previous: null as GainerIngredientKey | null,
    changed: false,
  });
  if (visual.key !== ingredientKey) {
    setVisual({ key: ingredientKey, previous: visual.key, changed: true });
  }
  useEffect(() => {
    if (!visual.previous) return;
    const timer = window.setTimeout(
      () =>
        setVisual((value) =>
          value.key === ingredientKey ? { ...value, previous: null } : value,
        ),
      animate ? 320 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [visual.previous, ingredientKey, animate]);
  const layers = [
    ...(visual.previous && animate
      ? [{ key: visual.previous, outgoing: true }]
      : []),
    ...(ingredientKey ? [{ key: ingredientKey, outgoing: false }] : []),
  ];
  return layers.map(({ key, outgoing }) => {
    const sources = gainerIngredientSources(key);
    return (
      <div
        className="gainer-ingredient-set"
        key={key}
        data-outgoing={outgoing}
        data-flavor={key}
      >
        {Array.from({ length: 4 }, (_, index) => {
          const outward = index === 0 ? -1 : 1;
          return (
            <span
              className={`gainer-ingredient gainer-ingredient-${index + 1}`}
              key={index}
            >
              <motion.span
                className="gainer-ingredient-motion"
                initial={
                  visual.changed && animate
                    ? { opacity: 0, x: outward * 18, y: 12, scale: 0.82 }
                    : false
                }
                animate={
                  outgoing
                    ? { opacity: 0, x: outward * 48, y: -20, scale: 0.8 }
                    : { opacity: 1, x: 0, y: 0, scale: 1 }
                }
                transition={{
                  duration: animate ? (outgoing ? 0.28 : 0.46) : 0,
                  delay: outgoing || !animate ? 0 : index * 0.025,
                  ease,
                }}
              >
                <img
                  src={sources[index % sources.length]}
                  crossOrigin="anonymous"
                  width={180}
                  height={180}
                  alt=""
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.style.visibility = "hidden";
                  }}
                />
              </motion.span>
            </span>
          );
        })}
      </div>
    );
  });
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
    const observer = window.IntersectionObserver
      ? new IntersectionObserver(
          ([entry]) => setVisible(entry.isIntersecting),
          { threshold: 0 },
        )
      : null;
    const update = () => setDocumentVisible(!document.hidden);
    update();
    if (observer) observer.observe(scene);
    else setVisible(true);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [containerRef]);
  const ingredientKey = gainerIngredientKey(flavor);
  const moving = !reduced && !saveData && visible && documentVisible && !paused;
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
        data-moving={moving}
        data-ingredient={ingredientKey ?? "none"}
        aria-hidden="true"
      >
        <IngredientLayers ingredientKey={ingredientKey} animate={moving} />
      </div>
    </>
  );
}
