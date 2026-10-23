import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import sharp from "sharp";
const work = process.argv[2],
  dest = "public/media/catalog-normalized-v2";
const r = JSON.parse(
  await readFile(`${work}/missing-normalized/report.json`, "utf8"),
);
const clean = JSON.parse(await readFile(`${work}/fix-back/report.json`, "utf8"))
  .records[0];
r.records = r.records.map((row) => (row.sku === "FIX-BCAA" ? clean : row));
r.review = r.records.filter((row) => row.status !== "ready");
if (r.records.some((x) => x.status === "manual-review"))
  throw new Error("Hay recortes fallidos.");
await mkdir(dest, { recursive: true });
for (const row of r.records)
  for (const o of Object.values(row.outputs))
    await copyFile(
      `${work}/${row.sku === "FIX-BCAA" ? "fix-back" : "missing-normalized"}/${o.filename}`,
      `${dest}/${o.filename}`,
    );
await writeFile(
  `${dest}/missing-report.json`,
  JSON.stringify(r, null, 2) + "\n",
);
const file = `${work}/drive/1LE7ICtmxa9luQV0jmiO5u-FUMvURjuFM.png`;
await sharp(file)
  .trim({ background: "#ffffff", threshold: 8 })
  .extend({ top: 24, bottom: 24, left: 24, right: 24, background: "#ffffff" })
  .resize({
    width: 1000,
    height: 1000,
    fit: "inside",
    withoutEnlargement: true,
  })
  .webp({ quality: 90 })
  .toFile(`${dest}/vitalmag-nutrition-20261023-v1.webp`);
console.log(
  r.records.map((x) => ({
    sku: x.sku,
    src: `/media/catalog-normalized-v2/${x.outputs[1000].filename}`,
  })),
);
