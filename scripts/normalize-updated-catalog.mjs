// Prepare an explicit batch from a read-only media audit; never writes Storage.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
const work = process.argv[2];
const audit = JSON.parse(await readFile(`${work}/audit.json`, "utf8"));
const registries = await Promise.all(
  ["normalized-images", "renormalized-images", "updated-images"].map(
    async (name) => {
      try {
        return JSON.parse(
          await readFile(`src/modules/catalog/${name}.json`, "utf8"),
        );
      } catch (e) {
        if (e.code === "ENOENT" && name === "updated-images") return {};
        throw e;
      }
    },
  ),
);
const known = Object.assign({}, ...registries);
const images = [];
for (const row of audit.rows) {
  if (row.error || row.kind === "informationImages" || known[row.path])
    continue;
  const { data, info } = await sharp(row.local)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const corners = [
    0,
    info.width - 1,
    (info.height - 1) * info.width,
    info.height * info.width - 1,
  ];
  const transparent = corners.every((i) => data[i * 4 + 3] < 24);
  images.push({
    id: row.id,
    sourcePath: row.path,
    variantId: row.variantId,
    slug: row.slug,
    sku: row.sku,
    input: row.local,
    matteMode:
      transparent && !row.slug.includes("mutant-mass")
        ? "existing-alpha"
        : "rembg",
  });
}
await writeFile(`${work}/normalize.json`, JSON.stringify({ images }, null, 2));
console.log(`${images.length} imágenes nuevas para normalizar.`);
