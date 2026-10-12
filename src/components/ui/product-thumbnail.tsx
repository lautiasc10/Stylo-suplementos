"use client";
import { useState } from "react";
import { Icon } from "./icon";
export function ProductThumbnail({
  src,
  alt,
  size = 96,
}: {
  src?: string;
  alt: string;
  size?: number;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  return (
    <span className="product-thumbnail">
      {src && failedSource !== src ? (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span
          className="product-thumbnail-placeholder"
          role="img"
          aria-label="Sin fotografía disponible"
        >
          <Icon name="bag" />
        </span>
      )}
    </span>
  );
}
