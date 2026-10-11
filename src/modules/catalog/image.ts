export async function inspectImage(file: File) {
  if (file.size > 5 * 1024 * 1024 || file.size < 12)
    throw new Error("Elegí una imagen de hasta 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (value, index) => bytes[index] === value,
  );
  const webp =
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  const mime = jpeg
    ? "image/jpeg"
    : png
      ? "image/png"
      : webp
        ? "image/webp"
        : "";
  if (!mime || file.type !== mime)
    throw new Error("La imagen debe ser JPEG, PNG o WebP válido.");
  return { bytes, mime, extension: jpeg ? "jpg" : png ? "png" : "webp" };
}
