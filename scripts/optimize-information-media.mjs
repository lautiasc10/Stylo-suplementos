// Manufacturer documents keep their content and proportions, without rembg.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const work = process.argv[2],
  dir = "public/media/catalog-normalized-v2";
const { rows } = JSON.parse(await readFile(`${work}/audit.json`, "utf8"));
await mkdir(dir, { recursive: true });
const registry = {},
  records = [];
for (const r of rows.filter(
  (r) => r.kind === "informationImages" && !r.error,
)) {
  const filename = `info-${r.id}-${r.hash.slice(0, 12)}-v1.webp`;
  const bytes = await sharp(r.local)
    .rotate()
    .resize({
      width: 1000,
      height: 1000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 90, effort: 6 })
    .toBuffer();
  if (bytes.length >= r.bytes) continue;
  await writeFile(`${dir}/${filename}`, bytes, { flag: "wx" }).catch(
    async (e) => {
      if (
        e.code !== "EEXIST" ||
        !(await readFile(`${dir}/${filename}`)).equals(bytes)
      )
        throw e;
    },
  );
  registry[r.path] = `/media/catalog-normalized-v2/${filename}`;
  records.push({
    id: r.id,
    sourcePath: r.path,
    sourceHash: r.hash,
    sourceBytes: r.bytes,
    bytes: bytes.length,
  });
}
await writeFile(
  "src/modules/catalog/information-images.json",
  JSON.stringify(registry, null, 2) + "\n",
);
await writeFile(
  `${dir}/information-report.json`,
  JSON.stringify({ records }, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    images: records.length,
    originalBytes: records.reduce((n, r) => n + r.sourceBytes, 0),
    optimizedBytes: records.reduce((n, r) => n + r.bytes, 0),
  }),
);
