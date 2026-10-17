"use client";

import { VariantRing } from "./VariantRing";
import type { Variant } from "@/modules/catalog/model";

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  variantId?: string;
  href?: string;
  thumbnailSrc?: string;
  information?: boolean;
  normalized?: boolean;
  srcSet?: string;
  sizes?: string;
  turnImages?: (GalleryImage & { view: "left" | "back" | "right" })[];
};
export type ProductGalleryProps = {
  variants: Variant[];
  images: GalleryImage[];
  href?: string;
  linkLabel?: string;
  mode?: "card" | "detail";
  delay?: number;
  startDelay?: number;
  onImageChange?: (image: GalleryImage) => void;
  initialVariantId?: string;
  onPrepareImage?: (image: GalleryImage) => void;
  prepareImage?: (image: GalleryImage) => Promise<unknown>;
  selectionRequest?: { variantId: string; nonce: number } | null;
  informationImages?: GalleryImage[];
  eager?: boolean;
};

export function ProductGallery(props: ProductGalleryProps) {
  if (!props.variants.length) return null;
  return (
    <VariantRing
      variants={props.variants.map((variant) => ({
        ...variant,
        images: props.images.filter(
          (image) =>
            image.variantId === variant.id ||
            (props.variants.length === 1 && !image.variantId),
        ),
      }))}
      activeId={props.initialVariantId}
      size={props.mode === "detail" ? "full" : "compact"}
      href={props.href}
      linkLabel={props.linkLabel}
      eager={props.eager}
      delay={props.delay}
      startDelay={props.startDelay}
      onChange={props.onImageChange}
      selectionRequest={props.selectionRequest}
      informationImages={props.informationImages}
      onPrepareImage={props.onPrepareImage}
      prepareImage={props.prepareImage}
    />
  );
}
