import normalizedImages from "./normalized-images.json";
import normalizedGallery from "./normalized-gallery.json";

/** Derivatives are selected only for the exact original Storage path. Replacing
 * a photo keeps working immediately; an unprocessed new path uses its original. */
export function normalizedPhotoProps(
  source: string,
  kind: "card" | "detail",
  original?: { path: string; imageBase: string },
) {
  const gallery =
    original?.imageBase && source === `${original.imageBase}/${original.path}`
      ? (normalizedGallery as Record<string, { src: string; framed: boolean }>)[
          original.path
        ]
      : undefined;
  const registered =
    gallery?.src ||
    (original?.imageBase && source === `${original.imageBase}/${original.path}`
      ? (normalizedImages as Record<string, string>)[original.path]
      : undefined);
  if (registered) source = registered;
  if (
    !/^\/media\/(?:normalization-trial-v1|products-normalized-v[12])\//.test(
      source,
    ) ||
    !source.endsWith("-1000.webp")
  )
    return {};
  const file = (size: number) =>
    source.replace(/-1000\.webp$/, `-${size}.webp`);
  return {
    normalized: true,
    framed: gallery?.framed || undefined,
    src: file(kind === "card" ? (gallery ? 600 : 640) : 1000),
    srcSet:
      kind === "card"
        ? `${file(320)} 320w, ${file(gallery ? 600 : 640)} ${gallery ? 600 : 640}w`
        : `${file(320)} 320w, ${file(gallery ? 600 : 640)} ${gallery ? 600 : 640}w, ${file(1000)} 1000w`,
    sizes:
      kind === "detail"
        ? "(min-width: 960px) 640px, 100vw"
        : "(min-width: 1280px) 24vw, (min-width: 960px) 32vw, 50vw",
    thumbnailSrc: file(320),
  };
}
