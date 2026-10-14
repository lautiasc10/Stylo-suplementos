type Bounds = { x: number; y: number; width: number; height: number };
const boundsCache = new Map<string, Bounds | null>();

function transparentBounds(image: HTMLImageElement): Bounds | null {
  if (boundsCache.has(image.src)) return boundsCache.get(image.src) ?? null;
  let bounds: Bounds | null = null;
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      192 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
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
      if (corners.every((i) => data[i + 3] < 20)) {
        let left = canvas.width,
          top = canvas.height,
          right = -1,
          bottom = -1;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] >= 160) {
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x);
              bottom = Math.max(bottom, y);
            }
          }
        }
        if (right >= left && bottom >= top) {
          left = Math.max(0, left - 1);
          top = Math.max(0, top - 1);
          right = Math.min(canvas.width - 1, right + 1);
          bottom = Math.min(canvas.height - 1, bottom + 1);
          bounds = {
            x: left / canvas.width,
            y: top / canvas.height,
            width: (right - left + 1) / canvas.width,
            height: (bottom - top + 1) / canvas.height,
          };
        }
      }
    }
  } catch {
    // Preserve the complete photograph if pixels cannot be read.
  }
  if (boundsCache.size >= 64) boundsCache.clear();
  boundsCache.set(image.src, bounds);
  return bounds;
}

export function fitProductPhoto(image: HTMLImageElement) {
  const stage = image.closest<HTMLElement>(".product-image-stage");
  if (!stage?.clientWidth || !stage.clientHeight || !image.naturalWidth) return;
  for (const property of ["width", "height", "left", "top"])
    image.style.removeProperty(property);
  delete image.dataset.onStone;
  const bounds = transparentBounds(image);
  if (!bounds) return;
  const stageAspect = stage.clientWidth / stage.clientHeight;
  const surface = stageAspect < 0.9 ? 0.81 : 0.77;
  const artAspect =
    (image.naturalWidth * bounds.width) / (image.naturalHeight * bounds.height);
  const artWidth = Math.min(0.78, ((surface - 0.08) / stageAspect) * artAspect);
  const artHeight = (artWidth * stageAspect) / artAspect;
  const width = artWidth / bounds.width,
    height = artHeight / bounds.height;
  image.style.width = `${width * 100}%`;
  image.style.height = `${height * 100}%`;
  image.style.left = `${((1 - artWidth) / 2 - bounds.x * width) * 100}%`;
  image.style.top = `${(surface - artHeight - bounds.y * height) * 100}%`;
  image.dataset.onStone = "true";
}
