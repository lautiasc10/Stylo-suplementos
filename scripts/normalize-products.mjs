import sharp from "sharp";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CANVAS = 1000;
const BASELINE = 900;
const TARGET_HEIGHT = 800;

function componentBounds(pixels, width, height) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let largest = null,
    secondary = 0;
  for (let seed = 0; seed < seen.length; seed++) {
    if (seen[seed] || pixels[seed * 4 + 3] <= 32) continue;
    let head = 0,
      tail = 1,
      left = width,
      right = 0,
      top = height,
      bottom = 0;
    queue[0] = seed;
    seen[seed] = 1;
    while (head < tail) {
      const index = queue[head++],
        x = index % width,
        y = Math.floor(index / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const next of [
        x ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ]) {
        if (next < 0 || seen[next] || pixels[next * 4 + 3] <= 32) continue;
        seen[next] = 1;
        queue[tail++] = next;
      }
    }
    const bounds = {
      left,
      top,
      width: right - left + 1,
      height: bottom - top + 1,
      area: tail,
    };
    if (!largest || tail > largest.area) {
      secondary = largest?.area ?? 0;
      largest = bounds;
    } else secondary = Math.max(secondary, tail);
  }
  return { bounds: largest, secondary };
}

/** Conservative matte removal, connected to the edges only. Complex scenes
 * are rejected rather than cutting a white label out of a jar or inventing it. */
function removeUniformBackground(pixels, width, height) {
  const corners = [0, width - 1, (height - 1) * width, width * height - 1];
  const color = [0, 1, 2].map(
    (c) => corners.reduce((sum, i) => sum + pixels[i * 4 + c], 0) / 4,
  );
  const distance = (i) =>
    Math.hypot(...color.map((c, channel) => pixels[i * 4 + channel] - c));
  if (corners.some((i) => distance(i) > 20)) return false;
  let matches = 0,
    border = 0;
  for (let x = 0; x < width; x++)
    for (const y of [0, height - 1]) {
      border++;
      if (distance(y * width + x) <= 24) matches++;
    }
  for (let y = 1; y < height - 1; y++)
    for (const x of [0, width - 1]) {
      border++;
      if (distance(y * width + x) <= 24) matches++;
    }
  if (matches / border < 0.95) return false;
  const seen = new Uint8Array(width * height),
    queue = new Int32Array(width * height);
  let head = 0,
    tail = 0;
  function visit(i) {
    if (seen[i] || distance(i) > 24) return;
    seen[i] = 1;
    queue[tail++] = i;
  }
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++],
      x = i % width,
      y = Math.floor(i / width);
    pixels[i * 4 + 3] = 0;
    if (x) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (y) visit(i - width);
    if (y < height - 1) visit(i + width);
  }
  return true;
}

export async function normalizeProduct(buffer) {
  const sourceHash = createHash("sha256").update(buffer).digest("hex");
  const { data, info } = await sharp(buffer, { limitInputPixels: 25_000_000 })
    .rotate()
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const warnings = [];
  let transparent = false;
  for (let i = 3; i < data.length; i += 4)
    if (data[i] < 250) {
      transparent = true;
      break;
    }
  if (!transparent) {
    if (!removeUniformBackground(data, info.width, info.height))
      return {
        status: "manual-review",
        sourceHash,
        warnings: [
          "Fondo complejo: requiere máscara manual o segmentación; no se exportó un recorte automático.",
        ],
      };
    warnings.push(
      "Fondo uniforme eliminado automáticamente: revisar bordes y zonas blancas del envase antes de aprobar.",
    );
  }
  const { bounds, secondary } = componentBounds(data, info.width, info.height);
  if (!bounds || bounds.area < 100)
    return {
      status: "manual-review",
      sourceHash,
      warnings: ["No se detectó un producto opaco con suficiente superficie."],
    };
  if (
    bounds.left === 0 ||
    bounds.top === 0 ||
    bounds.left + bounds.width === info.width ||
    bounds.top + bounds.height === info.height
  )
    warnings.push("El producto toca el borde original: podría estar cortado.");
  if (secondary > bounds.area * 0.02)
    warnings.push(
      "Hay otros componentes visibles: verificar que el recorte conserve todo el envase.",
    );
  const scale = Math.min(TARGET_HEIGHT / bounds.height, 900 / bounds.width);
  if (scale > 1.25)
    warnings.push(
      `Original pequeño: ampliación ${scale.toFixed(2)}×; el procesamiento no recupera detalle inexistente.`,
    );
  const width = Math.round(bounds.width * scale),
    height = Math.round(bounds.height * scale);
  if (height < 780)
    warnings.push(
      "Formato ancho: ocupa menos del 80 % del alto para conservar el producto completo.",
    );
  const { area: _area, ...extract } = bounds;
  const body = await sharp(data, { raw: info })
    .extract(extract)
    .resize(width, height, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  const png = await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: "#00000000",
    },
  })
    .composite([
      {
        input: body,
        left: Math.round((CANVAS - width) / 2),
        top: BASELINE - height,
      },
    ])
    .png()
    .toBuffer();
  const files = {};
  for (const size of [320, 640, 1000])
    files[size] = await sharp(png)
      .resize(size, size)
      .webp({ quality: 90, alphaQuality: 100, effort: 5 })
      .toBuffer();
  return {
    status: warnings.length ? "review" : "ready",
    sourceHash,
    source: {
      width: info.width,
      height: info.height,
      alreadyTransparent: transparent,
    },
    bounds: extract,
    placement: {
      width,
      height,
      left: Math.round((CANVAS - width) / 2),
      top: BASELINE - height,
      baseline: BASELINE,
    },
    warnings,
    files,
  };
}

async function writeNew(file, bytes) {
  try {
    await writeFile(file, bytes, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (!(await readFile(file)).equals(Buffer.from(bytes)))
      throw new Error(
        `El destino existe con otro contenido; no se sobrescribe: ${file}`,
      );
  }
}

export async function runNormalization({
  manifestPath,
  outputDir,
  quiet = false,
}) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.images) || !manifest.images.length)
    throw new Error("El manifiesto necesita una lista images.");
  await mkdir(outputDir, { recursive: true });
  const absoluteOutput = await realpath(outputDir);
  const records = [];
  for (const image of manifest.images) {
    const record = {
      id: image.id,
      productId: image.productId,
      variantId: image.variantId,
      kind: image.kind,
      label: image.label,
      sourcePath: image.sourcePath,
    };
    try {
      if (!/^[a-z0-9][a-z0-9_-]{0,100}$/i.test(image.id))
        throw new Error(
          "Identificador de imagen inválido para un archivo de salida.",
        );
      // Resolve local originals independently of cwd; outputs never share their directory.
      const source = await realpath(
        path.resolve(path.dirname(manifestPath), image.input),
      );
      if (path.dirname(source).toLowerCase() === absoluteOutput.toLowerCase())
        throw new Error("El destino debe estar separado de los originales.");
      const result = await normalizeProduct(await readFile(source));
      const { files, ...report } = result;
      Object.assign(record, report);
      if (files) {
        const stem = `${image.id}-${result.sourceHash.slice(0, 12)}-v1`;
        const outputs = {};
        for (const [size, bytes] of Object.entries(files)) {
          const filename = `${stem}-${size}.webp`;
          await writeNew(path.join(outputDir, filename), bytes);
          outputs[size] = { filename, bytes: bytes.length };
        }
        record.outputs = outputs;
      }
    } catch (error) {
      record.status = "manual-review";
      record.warnings = [error.message];
    }
    records.push(record);
  }
  const report = {
    version: 1,
    canvas: [CANVAS, CANVAS],
    targetHeight: TARGET_HEIGHT,
    baseline: BASELINE,
    records,
    review: records
      .filter((r) => r.status !== "ready")
      .map((r) => ({ id: r.id, label: r.label, warnings: r.warnings })),
  };
  await writeFile(
    path.join(outputDir, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  if (!quiet)
    console.log(
      JSON.stringify(
        {
          images: records.length,
          exported: records.filter((r) => r.outputs).length,
          review: report.review,
        },
        null,
        2,
      ),
    );
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const [manifestPath, outputDir] = process.argv.slice(2);
  if (!manifestPath || !outputDir) {
    console.error(
      "Uso: npm run media:normalize -- manifiesto.json carpeta-de-salida",
    );
    process.exitCode = 1;
  } else
    await runNormalization({
      manifestPath: path.resolve(manifestPath),
      outputDir: path.resolve(outputDir),
    });
}
