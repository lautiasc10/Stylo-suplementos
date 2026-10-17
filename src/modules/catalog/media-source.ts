// Keep data URLs and local/preview assets untouched. Public store photos use
// Next's existing optimizer, preserving the originals and transparent pixels.
export function catalogMediaSource(
  source: string,
  imageBase: string,
  kind: "card" | "detail" | "brand" | "thumbnail" = "card",
) {
  if (!imageBase.startsWith("https://") || !source.startsWith(`${imageBase}/`))
    return source;
  const width = kind === "detail" ? 1920 : kind === "thumbnail" ? 384 : 1200;
  return `/_next/image?url=${encodeURIComponent(source)}&w=${width}&q=85`;
}
