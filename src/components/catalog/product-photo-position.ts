const baseCache = new Map<string, number | null>();

function visibleBase(image: HTMLImageElement): number | null {
  if (baseCache.has(image.src)) return baseCache.get(image.src) ?? null;
  let base: number | null = null;
  try {
    const canvas = document.createElement("canvas");
    const sampleScale = Math.min(
      1,
      192 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * sampleScale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * sampleScale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      const corners = [
        0,
        (canvas.width - 1) * 4,
        (canvas.height - 1) * canvas.width * 4,
        data.length - 4,
      ];
      if (corners.every((index) => data[index + 3] < 20)) {
        for (let y = canvas.height - 1; y >= 0; y--) {
          let solid = 0;
          for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] >= 240) solid++;
          }
          if (solid >= 3) {
            base = (y + 1) / canvas.height;
            break;
          }
        }
      }
    }
  } catch {
    // An opaque or unreadable photo keeps its complete contain presentation.
  }
  if (baseCache.size >= 64) baseCache.clear();
  baseCache.set(image.src, base);
  return base;
}

export function positionProductPhoto(image: HTMLImageElement) {
  if (!image.closest(".product-image-gallery-card") || !image.naturalWidth)
    return;
  const aspect = image.naturalHeight / image.naturalWidth;
  const measuredBase = visibleBase(image);
  if (measuredBase === null) {
    image.style.removeProperty("--product-photo-y");
    return;
  }
  const fittedHeight = Math.min(1, aspect);
  const base = (1 - fittedHeight) / 2 + measuredBase * fittedHeight;
  const scale = aspect > 1.3 ? 1.4 : 1;
  const scaledBase = 0.5 + (base - 0.5) * scale;
  // Keep the original square frame and scale. Only translate its visible base
  // to the common rock surface, 21% of the card width above the stage bottom.
  image.style.setProperty(
    "--product-photo-y",
    `calc(100% - ${(0.21 + scaledBase) * 100}cqw)`,
  );
}
