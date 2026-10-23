import normalizedImages from "./normalized-images.json";
import renormalizedImages from "./renormalized-images.json";
import updatedImages from "./updated-images.json";
import informationImages from "./information-images.json";
import { imageProfile } from "./image-profile";

const images: Record<string, string> = {
  ...normalizedImages,
  ...renormalizedImages,
  ...updatedImages,
};

export function informationMediaSource(
  source: string,
  imageBase: string,
  path: string,
) {
  if (!imageBase || source !== `${imageBase}/${path}`) return source;
  return (informationImages as Record<string, string>)[path] ?? source;
}

/** Derivatives are selected only for the exact original Storage path. Replacing
 * a photo keeps working immediately; an unprocessed new path uses its original. */
export function normalizedPhotoProps(
  source: string,
  kind: "card" | "detail",
  original?: { path: string; imageBase: string },
) {
  const profile = original && imageProfile(original.path);
  if (original && profile?.kind === "normalized") {
    const exact =
      !!original.imageBase &&
      source === `${original.imageBase}/${original.path}`;
    if (!exact)
      return /^(data:image\/|blob:)/.test(source)
        ? { normalized: true, src: source }
        : {};
    const file = (size: number) =>
      `${original.imageBase}/${profile.file(size)}`;
    return {
      normalized: true,
      src: file(kind === "card" ? 600 : 1000),
      srcSet: `${file(320)} 320w, ${file(600)} 600w, ${file(1000)} 1000w`,
      sizes:
        kind === "detail"
          ? "(min-width: 960px) 640px, 100vw"
          : "(min-width: 1280px) 24vw, (min-width: 960px) 32vw, 50vw",
      thumbnailSrc: file(320),
    };
  }
  const registered =
    original?.imageBase && source === `${original.imageBase}/${original.path}`
      ? images[original.path]
      : undefined;
  if (registered) source = registered;
  if (
    !/^\/media\/(?:(?:normalization-trial|products-normalized|onefit-normalized)-v1|catalog-normalized-v2)\//.test(
      source,
    ) ||
    !source.endsWith("-1000.webp")
  )
    return {};
  const file = (size: number) =>
    source.replace(/-1000\.webp$/, `-${size}.webp`);
  // The updated One Fit profile uses the requested 600px card derivative;
  // older, approved exports keep their existing 640px copies.
  const cardSize =
    /^\/media\/(?:onefit-normalized-v1|catalog-normalized-v2)\//.test(source)
      ? 600
      : 640;
  return {
    normalized: true,
    src: file(kind === "card" ? cardSize : 1000),
    srcSet: `${file(320)} 320w, ${file(cardSize)} ${cardSize}w, ${file(1000)} 1000w`,
    sizes:
      kind === "detail"
        ? "(min-width: 960px) 640px, 100vw"
        : "(min-width: 1280px) 24vw, (min-width: 960px) 32vw, 50vw",
    thumbnailSrc: file(320),
  };
}
