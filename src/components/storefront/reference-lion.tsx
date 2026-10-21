"use client";

import Image from "next/image";
import { useRef } from "react";

/** Same two-pose crossfade as LionHero in the reference, using our real lion. */
export function ReferenceLion() {
  const poses = useRef<HTMLDivElement>(null);
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
      />
      <Image
        className="reference-lion-left"
        src="/visuals/stylo-lion-poster-left-v1.webp"
        alt=""
        fill
        loading="eager"
        unoptimized
        sizes="(max-width: 800px) 150vw, 1200px"
        onLoad={async (event) => {
          // Keep the right pose until the other image is actually decoded.
          try {
            await event.currentTarget.decode();
            if (poses.current) poses.current.dataset.leftReady = "true";
          } catch {
            // A missing pose must leave the current image visible.
          }
        }}
      />
    </div>
  );
}
