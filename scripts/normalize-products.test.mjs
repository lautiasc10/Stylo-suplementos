import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { normalizeProduct, runNormalization } from "./normalize-products.mjs";

async function pack(
  width,
  height,
  left,
  top,
  bodyWidth,
  bodyHeight,
  background = "#00000000",
) {
  const body = await sharp({
    create: {
      width: bodyWidth,
      height: bodyHeight,
      channels: 4,
      background: "#777777",
    },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: body, left, top }])
    .png()
    .toBuffer();
}

test("normaliza formas distintas a 800 px de alto y base 900 sin deformar", async () => {
  for (const shape of [
    [800, 600, 150, 50, 300, 500],
    [500, 1000, 130, 100, 240, 800],
  ]) {
    const normalized = await normalizeProduct(await pack(...shape));
    assert.equal(normalized.placement.height, 800);
    assert.equal(normalized.placement.top + normalized.placement.height, 900);
    assert.ok(
      Math.abs(normalized.placement.width / 800 - shape[4] / shape[5]) < 0.002,
    );
    const { width, height } = await sharp(normalized.files[1000]).metadata();
    assert.equal(width, 1000);
    assert.equal(height, 1000);
    assert.equal(
      (await sharp(normalized.files[1000]).stats()).channels[3].min,
      0,
    );
  }
});

test("elimina solo un fondo uniforme conectado al exterior y solicita revisión", async () => {
  const normalized = await normalizeProduct(
    await pack(400, 600, 100, 50, 200, 500, "#ffffff"),
  );
  assert.equal(normalized.status, "review");
  assert.equal(normalized.source.alreadyTransparent, false);
  assert.match(normalized.warnings[0], /Fondo uniforme/);
  assert.equal(
    (await sharp(normalized.files[1000]).stats()).channels[3].min,
    0,
  );
});

test("rechaza fondos complejos en vez de exportar un recorte inseguro", async () => {
  const pixels = Buffer.alloc(60 * 60 * 3);
  for (let y = 0; y < 60; y++)
    for (let x = 0; x < 60; x++) {
      const i = (y * 60 + x) * 3;
      pixels[i] = x * 4;
      pixels[i + 1] = y * 4;
      pixels[i + 2] = 100;
    }
  const original = await sharp(pixels, {
    raw: { width: 60, height: 60, channels: 3 },
  })
    .png()
    .toBuffer();
  const result = await normalizeProduct(original);
  assert.equal(result.status, "manual-review");
  assert.equal(result.files, undefined);
});

test("no modifica originales y el informe identifica archivos problemáticos", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "stylo-normalizer-test-"));
  await mkdir(path.join(dir, "originals"));
  const original = await pack(300, 500, 50, 50, 200, 400);
  await writeFile(path.join(dir, "originals", "pack.png"), original);
  await writeFile(
    path.join(dir, "manifest.json"),
    JSON.stringify({
      images: [
        {
          id: "sample",
          label: "Frasco de prueba",
          input: "originals/pack.png",
        },
        { id: "missing", label: "Archivo faltante", input: "missing.png" },
      ],
    }),
  );
  const report = await runNormalization({
    manifestPath: path.join(dir, "manifest.json"),
    outputDir: path.join(dir, "output"),
  });
  assert.ok(
    (await readFile(path.join(dir, "originals", "pack.png"))).equals(original),
  );
  assert.equal(report.records[1].status, "manual-review");
  assert.equal(report.review.length, 2);
  const output = path.join(
    dir,
    "output",
    report.records[0].outputs[1000].filename,
  );
  await writeFile(output, "no sobrescribir");
  const second = await runNormalization({
    manifestPath: path.join(dir, "manifest.json"),
    outputDir: path.join(dir, "output"),
  });
  assert.equal(await readFile(output, "utf8"), "no sobrescribir");
  assert.match(second.records[0].warnings[0], /no se sobrescribe/);
});
