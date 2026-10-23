import sharp from "sharp";
import { inspectImage } from "./image";
import type { ImagePurpose } from "./image-profile";

// These are offline upload operations. No Sharp code is shipped to the storefront.
const MAX_PIXELS = 16_000_000;
export async function prepareCatalogImage(
  file: File,
  productId: string,
  purpose: ImagePurpose,
) {
  const original = await inspectImage(file);
  const input = Buffer.from(original.bytes);
  const options = { limitInputPixels: MAX_PIXELS, failOn: "warning" as const };
  const meta = await sharp(input, options).metadata();
  if (!meta.width || !meta.height || (meta.pages ?? 1) > 1)
    throw new Error("Usá una imagen estática válida de hasta 16 megapíxeles.");
  const id = crypto.randomUUID();
  const originalPath = `${productId}/${id}.${original.extension}`;
  const originalFile = {
    path: originalPath,
    bytes: input,
    mime: original.mime,
  };
  if (purpose === "brand")
    return {
      path: originalPath,
      files: [originalFile],
      notice: "Logo conservado sin recortar.",
    };
  if (purpose === "information") {
    const path = `${productId}/${id}-information-v1-${original.extension}.webp`;
    const bytes = await sharp(input, options)
      .rotate()
      .resize({
        width: 1000,
        height: 1000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90, effort: 4 })
      .toBuffer();
    return {
      path,
      files: [originalFile, { path, bytes, mime: "image/webp" }],
      notice: "Ficha optimizada sin recortar textos. Original conservado.",
    };
  }
  if (!meta.hasAlpha)
    throw new Error(
      "La foto del envase necesita fondo transparente (PNG o WebP sin fondo). La imagen anterior se conserva.",
    );
  // Downsample before reading pixels to bound memory even for large originals.
  const { data, info } = await sharp(input, options)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const corners = [
    0,
    info.width - 1,
    (info.height - 1) * info.width,
    info.width * info.height - 1,
  ];
  if (corners.some((index) => data[index * 4 + 3] >= 24))
    throw new Error(
      "El fondo del envase sigue siendo opaco. Subí una versión sin fondo; la foto anterior se conserva.",
    );
  let left = info.width,
    top = info.height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const index = (y * info.width + x) * 4 + 3;
      if (data[index] < 24) data[index] = 0;
      if (data[index] >= 32) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  if (right < left || bottom < top)
    throw new Error("No se detectó un envase visible.");
  if (
    left === 0 ||
    top === 0 ||
    right === info.width - 1 ||
    bottom === info.height - 1
  )
    throw new Error(
      "El envase toca el borde y podría estar cortado. Subí la foto completa con margen transparente.",
    );
  const height = bottom - top + 1,
    width = right - left + 1;
  const targetWidth = Math.round((width * 800) / height);
  if (targetWidth > 900 || height < 320)
    throw new Error(
      "La foto tiene un encuadre muy ancho o poca resolución. Revisala antes de subirla.",
    );
  const cropped = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract({ left, top, width, height })
    .resize(targetWidth, 800)
    .png()
    .toBuffer();
  const canvas = await sharp({
    create: { width: 1000, height: 1000, channels: 4, background: "#00000000" },
  })
    .composite([
      { input: cropped, left: Math.floor((1000 - targetWidth) / 2), top: 100 },
    ])
    .png()
    .toBuffer();
  const path = `${productId}/${id}-normalized-v1-${original.extension}-1000.webp`;
  const files = [originalFile];
  const copies = await Promise.all(
    [320, 600, 1000].map(async (size) => {
      let quality = 90;
      let bytes = await sharp(canvas)
        .resize(size, size)
        .webp({ quality, effort: 4 })
        .toBuffer();
      while (size <= 600 && bytes.length > 60000 && quality > 70) {
        quality -= 5;
        bytes = await sharp(canvas)
          .resize(size, size)
          .webp({ quality, effort: 4 })
          .toBuffer();
      }
      if (size <= 600 && bytes.length > 60000)
        throw new Error(
          "La foto tiene demasiado detalle para una tarjeta liviana. Revisá el archivo antes de guardarlo.",
        );
      return {
        path: path.replace(/-1000\.webp$/, `-${size}.webp`),
        bytes,
        mime: "image/webp",
      };
    }),
  );
  files.push(...copies);
  return {
    path,
    files,
    notice: `${height < 800 ? "La fuente tiene menos de 800 px de alto; revisá su nitidez. " : ""}Foto ajustada a la escala del catálogo, con copias WebP. Original conservado.`,
  };
}
