"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Same two-pose crossfade as LionHero in the reference, using our real lion. */
export function ReferenceLion() {
  const poses = useRef<HTMLDivElement>(null);
  const [primaryReady, setPrimaryReady] = useState(false);
  const [interactive, setInteractive] = useState(false);
  useEffect(() => {
    const pointer = matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection;
      setInteractive(
        primaryReady &&
          pointer.matches &&
          !reduced.matches &&
          !connection?.saveData,
      );
    };
    update();
    pointer.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      pointer.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, [primaryReady]);
  useEffect(() => {
    if (!interactive) poses.current?.removeAttribute("data-left-ready");
  }, [interactive]);
  return (
    <div
      ref={poses}
      className="reference-lion-poses sport-hero-poster"
      data-facing="right"
    >
      <Image
        className="reference-lion-right"
        src="/visuals/stylo-lion-poster-right-v1.webp"
        alt=""
        fill
        priority
        unoptimized
        sizes="(max-width: 800px) 150vw, 1200px"
        onLoad={() => setPrimaryReady(true)}
      />
      {interactive && (
        <Image
          className="reference-lion-left"
          src="/visuals/stylo-lion-poster-left-v1.webp"
          alt=""
          fill
          loading="eager"
          fetchPriority="low"
          unoptimized
          sizes="(max-width: 800px) 150vw, 1200px"
          onLoad={async (event) => {
            // Keep the right pose until the other image is actually decoded.
            const image = event.currentTarget;
            try {
              await image.decode();
              if (poses.current && image.isConnected)
                poses.current.dataset.leftReady = "true";
            } catch {
              // A missing pose must leave the current image visible.
            }
          }}
          onError={() => poses.current?.removeAttribute("data-left-ready")}
        />
      )}
    </div>
  );
}
