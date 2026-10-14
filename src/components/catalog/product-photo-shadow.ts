// A small, cached UI shadow keeps the approved contour and soft offset without
// running a full-resolution blur filter on the animated product plane.
const shadows = new Map<string, string | null>();
export function productPhotoShadow(image: HTMLImageElement): string | null {
  if (shadows.has(image.src)) return shadows.get(image.src) ?? null;
  let result: string | null = null;
  try {
    const side = 192,
      padding = 24;
    const mask = document.createElement("canvas");
    mask.width = mask.height = side + padding * 2;
    const context = mask.getContext("2d");
    const output = document.createElement("canvas");
    output.width = output.height = mask.width;
    const shadow = output.getContext("2d");
    if (context && shadow) {
      const aspect = image.naturalWidth / image.naturalHeight;
      const width = Math.min(side, side * aspect);
      const height = Math.min(side, side / aspect);
      context.drawImage(
        image,
        padding + (side - width) / 2,
        padding + (side - height) / 2,
        width,
        height,
      );
      context.globalCompositeOperation = "source-in";
      context.fillStyle = "#241108";
      context.fillRect(0, 0, mask.width, mask.height);
      shadow.shadowColor = "#24110840";
      shadow.shadowBlur = (14 * side) / 720;
      shadow.shadowOffsetY = (18 * side) / 720;
      shadow.drawImage(mask, 0, 0);
      // Remove the solid silhouette, leaving only its soft shadow.
      shadow.globalCompositeOperation = "destination-out";
      shadow.shadowColor = "transparent";
      shadow.drawImage(mask, 0, 0);
      result = output.toDataURL("image/png");
    }
  } catch {
    // Unreadable cross-origin media retains the browser-filter fallback.
  }
  if (shadows.size >= 8) shadows.delete(shadows.keys().next().value!);
  shadows.set(image.src, result);
  return result;
}
