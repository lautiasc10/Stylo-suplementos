import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const work = process.argv[2];
const snapshot = JSON.parse(await readFile(`${work}/catalog.json`, "utf8"));
const drive = JSON.parse(
  await readFile("scripts/manifests/drive-media-20261023.json", "utf8"),
).files;
await mkdir(`${work}/originals`, { recursive: true });
const rows = snapshot.catalog.products.flatMap((p) =>
  ["images", "turnImages", "informationImages"].flatMap((kind) =>
    (p[kind] ?? []).map((i) => ({
      ...i,
      kind,
      slug: p.slug,
      sku: p.variants.find((v) => v.id === i.variantId)?.sku,
    })),
  ),
);
const digest = (b) => createHash("sha256").update(b).digest("hex");
for (let i = 0; i < rows.length; i += 5)
  await Promise.all(
    rows.slice(i, i + 5).map(async (r) => {
      try {
        const response = await fetch(`${snapshot.imageBase}/${r.path}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        r.local = `${work}/originals/${r.path.split("/").at(-1)}`;
        await writeFile(r.local, bytes);
        const m = await sharp(bytes).metadata();
        Object.assign(r, {
          hash: digest(bytes),
          bytes: bytes.length,
          width: m.width,
          height: m.height,
          alpha: m.hasAlpha,
        });
      } catch (e) {
        r.error = e.message;
      }
    }),
  );
for (const f of drive) {
  f.local = `${work}/drive/${f.id}.${f.title.split(".").at(-1)}`;
  const bytes = await readFile(f.local);
  const m = await sharp(bytes).metadata();
  Object.assign(f, {
    hash: digest(bytes),
    width: m.width,
    height: m.height,
    alpha: m.hasAlpha,
    exactMatches: rows
      .filter((r) => r.hash === digest(bytes))
      .map((r) => ({ slug: r.slug, kind: r.kind, sku: r.sku, path: r.path })),
  });
}
await writeFile(`${work}/audit.json`, JSON.stringify({ rows, drive }, null, 2));
// Contact sheets are review artifacts, never storefront assets.
for (const [name, files] of [
  ["drive", drive],
  ["catalog", rows.filter((r) => r.kind === "images")],
]) {
  for (let start = 0; start < files.length; start += 24) {
    const subset = files.slice(start, start + 24);
    const layers = [];
    for (const [i, f] of subset.entries()) {
      if (f.error) continue;
      const thumb = await sharp(f.local)
        .resize(180, 170, { fit: "inside" })
        .png()
        .toBuffer();
      const meta = await sharp(thumb).metadata();
      const x = (i % 6) * 220,
        y = Math.floor(i / 6) * 220;
      layers.push({
        input: thumb,
        left: x + Math.round((220 - meta.width) / 2),
        top: y,
      });
      const text = (f.title ?? `${f.sku ?? ""} ${f.slug}`)
        .replace(/[&<>]/g, "")
        .slice(0, 63);
      const svg = `<svg width="220" height="50"><text x="4" y="14" fill="white" font-size="10">${start + i}: ${text.slice(0, 32)}</text><text x="4" y="29" fill="white" font-size="10">${text.slice(32)}</text></svg>`;
      layers.push({ input: Buffer.from(svg), left: x, top: y + 175 });
    }
    await sharp({
      create: {
        width: 1320,
        height: Math.ceil(subset.length / 6) * 220,
        channels: 4,
        background: "#282522",
      },
    })
      .composite(layers)
      .png()
      .toFile(`${work}/${name}-${start}.png`);
  }
}
console.log(
  JSON.stringify(
    {
      catalogImages: rows.length,
      errors: rows.filter((r) => r.error),
      drive: drive.length,
      exactMatches: drive
        .filter((f) => f.exactMatches.length)
        .map((f) => ({ file: f.title, matches: f.exactMatches })),
    },
    null,
    2,
  ),
);
