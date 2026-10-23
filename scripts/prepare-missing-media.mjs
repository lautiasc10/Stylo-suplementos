import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const work = process.argv[2];
const { drive } = JSON.parse(await readFile(`${work}/audit.json`, "utf8"));
const selected = [
  ["1U_OfUEx6o_Wva0JYQgIyLeZih3Tfv1wC", "XBO-0001", "front"],
  ["1es1YSsyZPlWOPRS1jRK62xz0DCSUNOz7", "XBO-0002", "front"],
  ["18n_bZ98BKaMNVUhkR_5XhZxTC5PLFvUc", "XBO-0004", "front"],
  ["1-bk1s-jpLu45tvEbIn1QkgBT8VU8SLV5", "FIX-BCAA", "back"],
  ["1QmnkfCdkenDEh2b4uJ5amQzcxde7HUMp", "XBO-0015", "back"],
  ["17SU7r85YJCYpKNImsL8-ZklbpY7KCkSo", "XBO-0018", "back"],
];
await mkdir(`${work}/inputs`, { recursive: true });
const images = [];
for (const [id, sku, kind] of selected) {
  const f = drive.find((f) => f.id === id);
  let input = f.local;
  if (input.endsWith(".avif")) {
    input = `${work}/inputs/${id}.png`;
    await sharp(f.local).png().toFile(input);
  }
  images.push({
    id: sku === "FIX-BCAA" ? `${id}-clean` : id,
    sku,
    kind,
    input,
    matteMode:
      kind === "front" || sku === "FIX-BCAA" ? "rembg" : "existing-alpha",
    sourcePath: `drive:${id}`,
  });
}
await writeFile(`${work}/missing.json`, JSON.stringify({ images }, null, 2));
