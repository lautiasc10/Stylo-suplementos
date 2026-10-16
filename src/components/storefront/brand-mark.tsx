"use client";
import { useId } from "react";

export function BrandMark({ priority = false }: { priority?: boolean }) {
  const filterId = useId();
  return (
    <>
      {priority && (
        <link
          rel="preload"
          as="image"
          href="/branding/logo-principal.webp"
          fetchPriority="high"
        />
      )}
      <svg
        className="brand-isotype"
        viewBox="110 70 420 480"
        width="64"
        height="64"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="0"
            y="0"
            width="100%"
            height="100%"
          >
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1 0 0 0 0"
            />
            <feComponentTransfer>
              <feFuncA type="linear" slope="10" intercept="-0.08" />
            </feComponentTransfer>
          </filter>
        </defs>
        <image
          href="/branding/logo-principal.webp"
          width="640"
          height="640"
          filter={`url(#${filterId})`}
        />
      </svg>
      <span className="brand-copy">
        <span className="brand-wordmark">STYLO</span>
        <span className="brand-caption">SUPLEMENTOS</span>
      </span>
    </>
  );
}
