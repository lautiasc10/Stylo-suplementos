// Publish reviewed local derivatives, preserving originals and older exports.
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  constants,
} from "node:fs/promises";
const work = process.argv[2];
const report = JSON.parse(
  await readFile(`${work}/normalized/report.json`, "utf8"),
);
if (report.records.some((r) => r.status === "manual-review"))
  throw new Error("Revisar los recortes fallidos antes de publicar.");
const dir = "public/media/catalog-normalized-v2";
await mkdir(dir, { recursive: true });
let registry = {};
try {
  registry = JSON.parse(
    await readFile("src/modules/catalog/updated-images.json", "utf8"),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
for (const r of report.records) {
  for (const o of Object.values(r.outputs)) {
    const source = `${work}/normalized/${o.filename}`,
      target = `${dir}/${o.filename}`;
    try {
      await copyFile(source, target, constants.COPYFILE_EXCL);
    } catch (e) {
      if (
        e.code !== "EEXIST" ||
        !(await readFile(source)).equals(await readFile(target))
      )
        throw e;
    }
  }
  registry[r.sourcePath] =
    `/media/catalog-normalized-v2/${r.outputs[1000].filename}`;
}
// The current upload under Ripped V8 is actually Pump V8. Keep the previously
// verified Ripped photo until its association can be corrected in administration.
const ripped = report.records.find((r) => r.sku === "STAR-0014");
if (ripped)
  registry[ripped.sourcePath] =
    "/media/products-normalized-v1/8f05b69b-6646-458a-b011-8ad86c4eccb0-ee6526134d56-v1-1000.webp";
await writeFile(
  "src/modules/catalog/updated-images.json",
  JSON.stringify(registry, null, 2) + "\n",
);
await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    images: report.records.length,
    originalBytes: report.records.reduce((n, r) => n + r.sourceBytes, 0),
    cardBytes: report.records.reduce((n, r) => n + r.outputs[600].bytes, 0),
    largestCard: Math.max(...report.records.map((r) => r.outputs[600].bytes)),
    warnings: report.review.map((r) => ({ sku: r.sku, warnings: r.warnings })),
  }),
);
