/** Opt-in pilot assets. Existing Storage paths never change. */
export function normalizedPhotoProps(source: string, kind: "card" | "detail") {
  if (
    !source.startsWith("/media/normalization-trial-v1/") ||
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
        : "(min-width: 1280px) 24vw, (min-width: 640px) 32vw, 50vw",
    thumbnailSrc: file(320),
  };
}
