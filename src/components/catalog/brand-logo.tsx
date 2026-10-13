"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  aspect: number;
};
const boundsCache = new Map<string, Bounds | null>();

// Measure empty white/transparent margins for presentation; keep the source intact.
function logoBounds(image: HTMLImageElement): Bounds | null {
  if (boundsCache.has(image.src)) return boundsCache.get(image.src) ?? null;
  let bounds: Bounds | null = null;
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      256 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      const white = (i: number) =>
        data[i] >= 240 && data[i + 1] >= 240 && data[i + 2] >= 240;
      const corners = [
        0,
        (canvas.width - 1) * 4,
        (canvas.height - 1) * canvas.width * 4,
        data.length - 4,
      ];
      const transparent = corners.every((i) => data[i + 3] < 20);
      const whiteBackground = corners.every(
        (i) => data[i + 3] < 20 || white(i),
      );
      if (transparent || whiteBackground) {
        let left = canvas.width,
          top = canvas.height,
          right = -1,
          bottom = -1;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (data[i + 3] >= 20 && (transparent || !white(i))) {
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x);
              bottom = Math.max(bottom, y);
            }
          }
        }
        if (right >= left && bottom >= top) {
          left = Math.max(0, left - 2);
          top = Math.max(0, top - 2);
          right = Math.min(canvas.width - 1, right + 2);
          bottom = Math.min(canvas.height - 1, bottom + 2);
          bounds = {
            x: left / canvas.width,
            y: top / canvas.height,
            width: (right - left + 1) / canvas.width,
            height: (bottom - top + 1) / canvas.height,
            aspect: image.naturalWidth / image.naturalHeight,
          };
        }
      }
    }
  } catch {
    // Cross-origin restrictions or an unreadable image retain the complete logo.
  }
  if (boundsCache.size >= 64) boundsCache.clear();
  boundsCache.set(image.src, bounds);
  return bounds;
}

export function BrandLogo({
  src,
  name,
  detail = false,
}: {
  src: string;
  name: string;
  detail?: boolean;
}) {
  const image = useRef<HTMLImageElement>(null);
  const [measured, setMeasured] = useState<{
    src: string;
    bounds: Bounds | null;
  } | null>(null);
  const bounds = measured?.src === src ? measured.bounds : null;
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth) {
      setMeasured({ src, bounds: logoBounds(image.current) });
    }
  }, [src]);
  let style: CSSProperties | undefined;
  if (bounds) {
    const viewportAspect = detail ? 176 / 64 : 144 / 48;
    const artAspect = (bounds.width * bounds.aspect) / bounds.height;
    const artWidth = Math.min(1, artAspect / viewportAspect);
    const artHeight = Math.min(1, viewportAspect / artAspect);
    const width = artWidth / bounds.width,
      height = artHeight / bounds.height;
    style = {
      width: `${width * 100}%`,
      height: `${height * 100}%`,
      left: `${((1 - artWidth) / 2 - bounds.x * width) * 100}%`,
      top: `${((1 - artHeight) / 2 - bounds.y * height) * 100}%`,
    };
  }
  return (
    <span className="product-brand-logo" data-detail={detail || undefined}>
      <span className="product-brand-logo-art">
        <img
          ref={image}
          src={src}
          alt={name}
          width={detail ? 176 : 144}
          height={detail ? 64 : 48}
          crossOrigin="anonymous"
          loading={detail ? "eager" : "lazy"}
          style={style}
          onLoad={(event) =>
            setMeasured({ src, bounds: logoBounds(event.currentTarget) })
          }
        />
      </span>
    </span>
  );
}
