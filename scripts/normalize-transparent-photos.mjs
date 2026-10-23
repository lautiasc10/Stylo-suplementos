/** Normalize already transparent product photos without changing the originals.
 * Usage: node scripts/normalize-transparent-photos.mjs manifest.json output-directory
 * Manifest: { images: [{ id, input, sourcePath, sku }] }
 */
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import sharp from "sharp";

const [manifestPath, outputPath] = process.argv.slice(2);
if (!manifestPath || !outputPath) {
  throw new Error("Uso: normalize-transparent-photos.mjs manifest.json output-directory");
}

const CANVAS = 1000;
const HEIGHT = 800;
const BASELINE = 900;
const SIZES = [320, 600, 1000];
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const outputDir = resolve(outputPath);
await mkdir(outputDir, { recursive: true });

async function writeWithoutReplacing(path, bytes) {
  try {
    await writeFile(path, bytes, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const current = await readFile(path);
    if (!current.equals(bytes)) throw new Error(`Destino existente con otros bytes: ${path}`);
  }
}

function largestAlphaComponent(data, width, height) {
  const count = width * height;
  const labels = new Int32Array(count);
  const queue = new Int32Array(count);
  let component = 0;
  let best = { area: 0, label: 0, left: width, top: height, right: 0, bottom: 0 };
  for (let index = 0; index < count; index++) {
    if (labels[index] || data[index * 4 + 3] < 32) continue;
    component++;
    let head = 0, tail = 1;
    let left = width, top = height, right = 0, bottom = 0;
    queue[0] = index;
    labels[index] = component;
    while (head < tail) {
      const current = queue[head++];
      const x = current % width;
      const y = (current - x) / width;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ];
      for (const next of neighbors) {
        if (next < 0 || labels[next] || data[next * 4 + 3] < 32) continue;
        labels[next] = component;
        queue[tail++] = next;
      }
    }
    if (tail > best.area) best = { area: tail, label: component, left, top, right, bottom };
  }
  if (!best.area) throw new Error("No se detectó un envase opaco.");

  // Keep the antialiased edge of the main object, dropping isolated specks.
  const support = new Uint8Array(count);
  for (let i = 0; i < count; i++) if (labels[i] === best.label) support[i] = 1;
  for (let pass = 0; pass < 2; pass++) {
    const next = support.slice();
    for (let i = 0; i < count; i++) {
      if (!support[i]) continue;
      const x = i % width;
      const y = (i - x) / width;
      if (x > 0) next[i - 1] = 1;
      if (x + 1 < width) next[i + 1] = 1;
      if (y > 0) next[i - width] = 1;
      if (y + 1 < height) next[i + width] = 1;
    }
    support.set(next);
  }
  for (let i = 0; i < count; i++) if (!support[i] || data[i * 4 + 3] < 24) data[i * 4 + 3] = 0;
  return best;
}

const records = [];
for (const item of manifest.images) {
  const record = Object.fromEntries(
    ["id", "sourcePath", "sku", "slug", "flavor"].filter(key => key in item).map(key => [key, item[key]]),
  );
  try {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(item.id)) throw new Error("ID no válido.");
    const input = resolve(dirname(resolve(manifestPath)), item.input);
    if (dirname(input) === outputDir) throw new Error("Separar salida de originales.");
    const original = await readFile(input);
    const hash = createHash("sha256").update(original).digest("hex");
    const { data, info } = await sharp(original).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 4 || [0, info.width - 1, (info.height - 1) * info.width, info.width * info.height - 1]
      .some(index => data[index * 4 + 3] >= 24)) throw new Error("El original debe tener esquinas transparentes.");
    const bounds = largestAlphaComponent(data, info.width, info.height);
    const cropWidth = bounds.right - bounds.left;
    const cropHeight = bounds.bottom - bounds.top;
    if (bounds.left === 0 || bounds.top === 0 || bounds.right === info.width || bounds.bottom === info.height) {
      throw new Error("El envase toca un borde del original.");
    }
    const targetWidth = Math.round(cropWidth * HEIGHT / cropHeight);
    if (targetWidth > 900) throw new Error("El recorte es demasiado ancho.");
    const product = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left: bounds.left, top: bounds.top, width: cropWidth, height: cropHeight })
      .resize(targetWidth, HEIGHT, { kernel: "lanczos3" }).png().toBuffer();
    const canvas = await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: "#00000000" } })
      .composite([{ input: product, left: Math.floor((CANVAS - targetWidth) / 2), top: BASELINE - HEIGHT }])
      .png().toBuffer();
    const outputs = {};
    for (const size of SIZES) {
      const bytes = await sharp(canvas).resize(size, size).webp({ quality: 90, effort: 6 }).toBuffer();
      const filename = `${item.id}-${hash.slice(0, 12)}-v1-${size}.webp`;
      await writeWithoutReplacing(join(outputDir, filename), bytes);
      outputs[size] = { filename, bytes: bytes.length };
    }
    Object.assign(record, {
      status: "ready", sourceHash: hash, sourceBytes: original.length,
      source: { width: info.width, height: info.height },
      bounds: [bounds.left, bounds.top, bounds.right, bounds.bottom],
      placement: { left: Math.floor((CANVAS - targetWidth) / 2), top: 100, width: targetWidth, height: HEIGHT, baseline: BASELINE },
      outputs,
    });
  } catch (error) {
    Object.assign(record, { status: "manual-review", warning: String(error.message || error) });
  }
  records.push(record);
  console.log(JSON.stringify({ sku: record.sku, status: record.status, warning: record.warning }));
}
const report = { version: 1, pipeline: "sharp/existing-alpha", canvas: [CANVAS, CANVAS], targetHeight: HEIGHT, baseline: BASELINE, records };
await writeFile(join(outputDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
if (records.some(record => record.status !== "ready")) process.exitCode = 1;
