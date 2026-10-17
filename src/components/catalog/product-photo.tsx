"use client";
import Image, { getImageProps, type ImageLoaderProps } from "next/image";
import { memo, type SyntheticEvent } from "react";
import type { GalleryImage } from "./product-gallery";
import type { RingSize } from "./variant-ring-poses";

const emptyPixel = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
function options(photo: GalleryImage, size: RingSize, enabled = true) {
  const normalized = !!photo.normalized && /-\d+\.webp$/.test(photo.src);
  const compact = size === "compact";
  const loader = ({ width }: ImageLoaderProps) => {
    const medium = photo.src.includes("products-normalized-v2") ? 600 : 640;
    const output =
      width <= 320 ? 320 : compact || width <= medium ? medium : 1000;
    return photo.src.replace(/-\d+\.webp$/, `-${output}.webp`);
  };
  return {
    src: enabled ? photo.src : emptyPixel,
    alt: photo.alt,
    width: 1000,
    height: 1000,
    sizes: compact
      ? "(min-width: 1536px) calc((100vw - 430px) / 4), (min-width: 960px) calc((100vw - 380px) / 3), calc((100vw - 48px) / 2)"
      : "(min-width: 960px) 640px, calc(100vw - 32px)",
    loader: normalized && enabled ? loader : undefined,
    unoptimized: !normalized || !enabled,
  };
}
export function photoDelivery(photo: GalleryImage, size: RingSize) {
  const { props } = getImageProps(options(photo, size));
  return { srcSet: props.srcSet, sizes: props.sizes };
}
export const ProductPhoto = memo(
  function ProductPhoto({
    photo,
    size,
    enabled,
    active,
    eager,
    onLoad,
    onError,
  }: {
    photo: GalleryImage;
    size: RingSize;
    enabled: boolean;
    active: boolean;
    eager: boolean;
    onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
    onError: () => void;
  }) {
    return (
      <Image
        {...options(photo, size, enabled)}
        alt={active ? photo.alt : ""}
        className={`product-frame${active ? " product-frame-current" : ""}`}
        crossOrigin="anonymous"
        decoding="async"
        draggable={false}
        loading={active && eager ? "eager" : "lazy"}
        fetchPriority={active && eager && size === "full" ? "high" : "auto"}
        onLoad={(event) => {
          if (enabled) onLoad(event);
        }}
        onError={onError}
      />
    );
  },
  (a, b) =>
    a.photo === b.photo &&
    a.size === b.size &&
    a.enabled === b.enabled &&
    a.active === b.active &&
    a.eager === b.eager,
);
