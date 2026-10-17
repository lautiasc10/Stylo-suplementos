import {
  variantImages,
  variantTurnImages,
  variantInformationImages,
  type Product,
} from "@/modules/catalog/model";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import type { GalleryImage } from "./product-gallery";

export function galleryPhotos(
  product: Product,
  variantId: string,
  imageBase: string,
  imageUrls: Record<string, string>,
  kind: "card" | "detail" = "detail",
): GalleryImage[] {
  const source = (path: string) =>
    imageUrls[path] || (imageBase ? `${imageBase}/${path}` : "");
  const turns = variantTurnImages(product, variantId)
    .filter((image) => source(image.path))
    .map((image) => ({
      id: image.id,
      alt: image.alt,
      view: image.view!,
      src: catalogMediaSource(source(image.path), imageBase, kind),
      thumbnailSrc: catalogMediaSource(
        source(image.path),
        imageBase,
        "thumbnail",
      ),
    }));
  return variantImages(product, variantId)
    .filter((image) => source(image.path))
    .map((image) => ({
      id: `${variantId}:${image.id}`,
      variantId,
      alt: image.alt,
      src: catalogMediaSource(source(image.path), imageBase, kind),
      thumbnailSrc: catalogMediaSource(
        source(image.path),
        imageBase,
        "thumbnail",
      ),
      turnImages: turns,
    }));
}

export function galleryInformation(
  product: Product,
  variantId: string,
  imageBase: string,
  imageUrls: Record<string, string>,
): GalleryImage[] {
  return variantInformationImages(product, variantId).flatMap((image) => {
    const src =
      imageUrls[image.path] || (imageBase ? `${imageBase}/${image.path}` : "");
    return src
      ? [
          {
            id: image.id,
            variantId,
            src,
            alt: image.alt,
            thumbnailSrc: catalogMediaSource(src, imageBase, "thumbnail"),
            information: true,
          },
        ]
      : [];
  });
}
