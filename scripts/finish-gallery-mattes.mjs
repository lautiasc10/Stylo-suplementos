// Conservative second pass for photographed rear labels rejected by rembg.
// Remove edge-connected white only; never recolor print or replace originals.
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { normalizeProduct } from "./normalize-products.mjs";
const work = process.argv[2];
if (!work) throw new Error("Pass the temporary original folder");
const root = "public/media/products-normalized-v2";
const report = JSON.parse(await readFile(`${root}/report.json`, "utf8"));
const registry = JSON.parse(
  await readFile("src/modules/catalog/normalized-gallery.json", "utf8"),
);
for (const record of report.records) {
  if (record.previousSegmentation) {
    record.status = record.previousSegmentation;
    record.framed = true;
    record.outputs = {};
    for (const size of [320, 600, 1000]) {
      const filename = `${record.id}-${record.sourceHash.slice(0, 12)}-v2-${size}.webp`;
      record.outputs[size] = {
        filename,
        bytes: (await stat(`${root}/${filename}`)).size,
      };
    }
    registry[record.sourcePath] = {
      src: `/media/products-normalized-v2/${record.outputs[1000].filename}`,
      framed: true,
    };
    delete record.previousSegmentation;
  }
  if (
    record.status !== "framed-segmentation-failed" ||
    !record.label.startsWith("Etiqueta e")
  )
    continue;
  const original = await readFile(
    path.join(work, "originals", path.basename(record.sourcePath)),
  );
  const result = await normalizeProduct(original);
  if (!result.files) continue;
  const { data, info } = await sharp(original)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const candidate = await sharp(result.files[1000])
    .extract({
      left: result.placement.left,
      top: result.placement.top,
      width: result.placement.width,
      height: result.placement.height,
    })
    .resize(result.bounds.width, result.bounds.height)
    .ensureAlpha()
    .raw()
    .toBuffer();
  let white = 0,
    lost = 0;
  for (
    let y = Math.ceil(result.bounds.height * 0.2);
    y < result.bounds.height * 0.85;
    y++
  )
    for (
      let x = Math.ceil(result.bounds.width * 0.2);
      x < result.bounds.width * 0.8;
      x++
    ) {
      const source =
        ((y + result.bounds.top) * info.width + x + result.bounds.left) * 4;
      if (
        data[source] >= 235 &&
        data[source + 1] >= 235 &&
        data[source + 2] >= 235
      ) {
        white++;
        if (candidate[(y * result.bounds.width + x) * 4 + 3] < 245) lost++;
      }
    }
  record.interiorWhiteLoss = +(lost / Math.max(1, white)).toFixed(5);
  if (record.interiorWhiteLoss > 0.003) {
    record.matteRejected =
      "El recorte elimina partes blancas impresas de la etiqueta; se conserva íntegra dentro del marco.";
    continue;
  }
  const outputs = {};
  for (const size of [320, 600, 1000]) {
    const filename = `${record.id}-${record.sourceHash.slice(0, 12)}-matte-v2-${size}.webp`;
    const bytes = await sharp(result.files[1000])
      .resize(size, size)
      .webp({ quality: size === 1000 ? 90 : 82, alphaQuality: 100 })
      .toBuffer();
    await writeFile(`${root}/${filename}`, bytes, { flag: "wx" }).catch(
      async (error) => {
        if (
          error.code !== "EEXIST" ||
          !(await readFile(`${root}/${filename}`)).equals(bytes)
        )
          throw error;
      },
    );
    outputs[size] = { filename, bytes: bytes.length };
  }
  record.previousSegmentation = record.status;
  record.status = "uniform-background-removed-review";
  record.framed = false;
  record.outputs = outputs;
  record.placement = result.placement;
  record.warnings = result.warnings;
  registry[record.sourcePath] = {
    src: `/media/products-normalized-v2/${outputs[1000].filename}`,
    framed: false,
  };
}
report.exceptions = report.records.filter((r) =>
  /failed|review/.test(r.status),
);
await writeFile(`${root}/report.json`, JSON.stringify(report, null, 2) + "\n");
await writeFile(
  "src/modules/catalog/normalized-gallery.json",
  JSON.stringify(registry, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    report.records
      .filter((r) => r.previousSegmentation)
      .map((r) => ({ label: r.label, status: r.status })),
  ),
);
