import normalizedImages from "./normalized-images.json";

/** Derivatives are selected only for the exact original Storage path. Replacing
 * a photo keeps working immediately; an unprocessed new path uses its original. */
export function normalizedPhotoProps(
  source: string,
  kind: "card" | "detail",
  original?: { path: string; imageBase: string },
) {
  const registered =
    original?.imageBase && source === `${original.imageBase}/${original.path}`
      ? (normalizedImages as Record<string, string>)[original.path]
      : undefined;
  if (registered) source = registered;
  if (
    !/^\/media\/(?:normalization-trial|products-normalized)-v1\//.test(
      source,
    ) ||
    !source.endsWith("-1000.webp")
  )
    return {};
  const file = (size: number) =>
    source.replace(/-1000\.webp$/, `-${size}.webp`);
  return {
    normalized: true,
    src: file(kind === "card" ? 640 : 1000),
    srcSet: `${file(320)} 320w, ${file(640)} 640w, ${file(1000)} 1000w`,
    sizes:
      kind === "detail"
        ? "(min-width: 960px) 640px, 100vw"
        : "(min-width: 1280px) 24vw, (min-width: 960px) 32vw, 50vw",
    thumbnailSrc: file(320),
  };
}
