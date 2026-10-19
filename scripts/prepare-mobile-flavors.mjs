// Lossy WebP derivatives of existing decorations; originals stay untouched.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const directory = path.resolve("public/sabores");
const output = path.join(directory, "mobile");
await fs.mkdir(output, { recursive: true });
const report = [];
for (const file of (await fs.readdir(directory)).filter((file) =>
  file.endsWith("-decor-v1.webp"),
)) {
  const source = await fs.readFile(path.join(directory, file));
  const original = await sharp(source).metadata();
  const result = await sharp(source)
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 100, effort: 5 })
    .toBuffer();
  const metadata = await sharp(result).metadata();
  if (original.hasAlpha && !metadata.hasAlpha)
    throw new Error(`Lost transparency: ${file}`);
  await fs.writeFile(path.join(output, file), result);
  report.push({
    file,
    originalBytes: source.length,
    bytes: result.length,
    width: metadata.width,
    height: metadata.height,
    hasAlpha: metadata.hasAlpha,
  });
}
await fs.mkdir("docs/reviews/mobile-storefront", { recursive: true });
await fs.writeFile(
  "docs/reviews/mobile-storefront/decoraciones.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    files: report.length,
    originalBytes: report.reduce((sum, file) => sum + file.originalBytes, 0),
    bytes: report.reduce((sum, file) => sum + file.bytes, 0),
  }),
);
