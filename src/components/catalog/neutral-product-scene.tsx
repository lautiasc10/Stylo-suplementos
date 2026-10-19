"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "@/components/ui/use-motion-preference";

/** Three packaging formats for visual approval before extending the scene. */
export const neutralProductTrialSlugs = new Set([
  "onefit-creatina-micronizada-poweraded-x-200gr",
  "xbody-zinc-magnesio-vitamina-b6-zma-90-capsulas",
  "star-nutrition-cafeina-200-x-30-caps",
]);

/** Static HTML supplies the atmosphere. Two small compositor layers drift for
 * less than five seconds, then settle; no canvas, frame loop or image download. */
export function NeutralProductScene() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  const [enhanced, setEnhanced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [saveData, setSaveData] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    setEnhanced(true);
    setSaveData(
      Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData,
      ),
    );
    const visibility = () => setDocumentVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const observer = window.IntersectionObserver
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
      : null;
    if (observer) observer.observe(element);
    else setVisible(true);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <div
      ref={root}
      className="neutral-product-scene"
      aria-hidden="true"
      data-motion={
        enhanced && reduced === false && !saveData ? "true" : undefined
      }
      data-playing={visible && documentVisible ? "true" : undefined}
      data-settled={settled ? "true" : undefined}
      onAnimationEnd={(event) => {
        if (event.animationName === "neutral-particles-near") setSettled(true);
      }}
    >
      <div className="neutral-scene-field">
        <span className="neutral-scene-particles neutral-scene-particles-far" />
        <span className="neutral-scene-particles neutral-scene-particles-near" />
      </div>
    </div>
  );
}
