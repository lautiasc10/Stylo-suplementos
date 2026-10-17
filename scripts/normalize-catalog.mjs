import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { runNormalization } from "./normalize-products.mjs";

// Reads a public catalog export. This command never writes to Supabase.
const [snapshotFile, workDir] = process.argv.slice(2);
if (!snapshotFile || !workDir)
  throw new Error(
    "Uso: node scripts/normalize-catalog.mjs catalogo.json carpeta-temporal",
  );
const snapshot = JSON.parse(await readFile(snapshotFile, "utf8"));
const base = new URL(snapshot.imageBase);
if (
  base.protocol !== "https:" ||
  !base.pathname.endsWith("/storage/v1/object/public/product-media")
)
  throw new Error("El origen debe ser el bucket público product-media.");
const work = path.resolve(workDir);
await mkdir(path.join(work, "originals"), { recursive: true });
const outputDir = "public/media/products-normalized-v1";
const pilot = JSON.parse(
  await readFile("public/media/normalization-trial-v1/report.json", "utf8"),
);
const images = snapshot.catalog.products.flatMap((product) =>
  [
    ...product.images.map((image) => ({ ...image, kind: "front" })),
    ...(product.turnImages ?? []).map((image) => ({ ...image, kind: "turn" })),
  ].map((image) => ({
    id: image.id,
    productId: product.id,
    variantId: image.variantId,
    kind: image.kind,
    label: image.alt,
    sourcePath: image.path,
  })),
);
const reused = [],
  pending = [];
for (let offset = 0; offset < images.length; offset += 3) {
  await Promise.all(
    images.slice(offset, offset + 3).map(async (image) => {
      if (
        !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:png|webp|jpe?g)$/i.test(
          image.sourcePath,
        )
      )
        throw new Error("Ruta de imagen inválida.");
      const local = path.join(
        work,
        "originals",
        path.basename(image.sourcePath),
      );
      try {
        await access(local);
      } catch {
        const response = await fetch(
          `${snapshot.imageBase}/${image.sourcePath}`,
          { signal: AbortSignal.timeout(30000) },
        );
        if (!response.ok)
          throw new Error(
            `No se pudo leer ${image.label}: HTTP ${response.status}`,
          );
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 20 * 1024 * 1024)
          throw new Error("Original demasiado grande.");
        await writeFile(local, bytes, { flag: "wx" });
      }
      const hash = createHash("sha256")
        .update(await readFile(local))
        .digest("hex");
      const existing = pilot.records.find(
        (record) =>
          record.sourcePath === image.sourcePath &&
          record.sourceHash === hash &&
          record.outputs,
      );
      if (
        existing &&
        (
          await Promise.all(
            Object.values(existing.outputs).map(async (output) => {
              try {
                await access(
                  `public/media/normalization-trial-v1/${output.filename}`,
                );
                return true;
              } catch {
                return false;
              }
            }),
          )
        ).every(Boolean)
      )
        reused.push({
          ...existing,
          assetRoot: "/media/normalization-trial-v1",
        });
      else pending.push({ ...image, input: path.relative(work, local) });
    }),
  );
}
const manifestPath = path.join(work, "input.json");
await writeFile(manifestPath, JSON.stringify({ images: pending }, null, 2));
const generated = pending.length
  ? await runNormalization({ manifestPath, outputDir, quiet: true })
  : { records: [] };
const records = [
  ...reused,
  ...generated.records.map((record) => ({
    ...record,
    assetRoot: "/media/products-normalized-v1",
  })),
].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
const registry = Object.fromEntries(
  records
    .filter((record) => record.outputs)
    .map((record) => [
      record.sourcePath,
      `${record.assetRoot}/${record.outputs[1000].filename}`,
    ]),
);
await writeFile(
  "src/modules/catalog/normalized-images.json",
  JSON.stringify(registry, null, 2) + "\n",
);
await mkdir(outputDir, { recursive: true });
await writeFile(
  `${outputDir}/report.json`,
  JSON.stringify(
    {
      version: 1,
      products: snapshot.catalog.products.length,
      records,
      review: records
        .filter((record) => record.status !== "ready")
        .map((record) => ({
          id: record.id,
          label: record.label,
          warnings: record.warnings,
        })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      images: images.length,
      reused: reused.length,
      generated: generated.records.length,
      normalized: Object.keys(registry).length,
      manualReview: records
        .filter((record) => record.status === "manual-review")
        .map((record) => ({ label: record.label, warnings: record.warnings })),
      qualityWarnings: records.filter((record) => record.status === "review")
        .length,
    },
    null,
    2,
  ),
);
