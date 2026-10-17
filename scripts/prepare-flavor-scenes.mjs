import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Originals stay untouched; only these new, verified transparent files are used.
const sources = {
  anana: "anana.png",
  cereza: "ceresa.png",
  chocolate: "chocolate.png",
  cookies: "cookies-and-cream.png",
  "dulce-de-leche": "dulce-de-leche.png",
  "frutos-rojos": "frutos-rojos.png",
  limon: "limon.png",
  multifruta: "multifruta.png",
  naranja: "naranja.png",
  pomelo: "pomelo.png",
  sandia: "sandia.png",
  uva: "uva.png",
};
const directory = path.resolve("public/sabores");
const report = [];
for (const [name, file] of Object.entries(sources)) {
  const input = await fs.readFile(path.join(directory, file));
  const metadata = await sharp(input).metadata();
  const stats = await sharp(input).stats();
  if (!metadata.hasAlpha || stats.isOpaque) {
    throw new Error(
      `${file}: real transparency is required; original preserved.`,
    );
  }
  const output = `${name}-decor-v1.webp`;
  const image = await sharp(input)
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 100, effort: 5 })
    .toBuffer();
  const result = await sharp(image).metadata();
  await fs.writeFile(path.join(directory, output), image);
  report.push({
    source: file,
    sha256: createHash("sha256").update(input).digest("hex"),
    originalBytes: input.length,
    output,
    bytes: image.length,
    width: result.width,
    height: result.height,
    transparent: true,
  });
}
await fs.writeFile(
  "docs/reviews/fondos-sabores-assets.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
