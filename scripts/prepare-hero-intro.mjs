// Local preparation only: keeps the supplied video and official logos intact.
// Usage: node scripts/prepare-hero-intro.mjs <path-to-ffmpeg>
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const ffmpeg = process.argv[2] || "ffmpeg";
const frameWidth = 1280;
const frameHeight = 720;
const work = await mkdtemp(join(tmpdir(), "stylo-intro-layers-"));
const frames = join(work, "frames");
const atlas = join(work, "atlas");
await mkdir(frames);
await mkdir(atlas);
const run = (args) =>
  execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], {
    stdio: "inherit",
  });
run([
  "-ss",
  "0.6",
  "-i",
  "public/visuals/stylo-scoop-intro-v1.mp4",
  "-vf",
  `scale=${frameWidth}:${frameHeight}`,
  "-y",
  join(frames, "%03d.png"),
]);

// Rotoscope the metal rim, bowl and handle. The pouring stream belongs to the
// stationary layer. The mask follows the supplied clip, never product photos.
const contours = [
  [2.6, [382, 215, 360, 268, 325, 312, 298, 338, 274, 353, 248, 356]],
  [2.8, [365, 202, 347, 253, 320, 293, 298, 318, 277, 338, 248, 342]],
  [3.2, [342, 190, 324, 236, 297, 277, 277, 301, 253, 316, 226, 318]],
  [3.8, [315, 178, 299, 219, 270, 257, 249, 279, 229, 291, 203, 292]],
  [4.1, [311, 174, 294, 215, 266, 253, 244, 275, 225, 286, 199, 288]],
];
function contourAt(time) {
  const after = contours.findIndex(([at]) => at >= time);
  if (after <= 0) return contours[after === -1 ? contours.length - 1 : 0][1];
  const [start, a] = contours[after - 1];
  const [end, b] = contours[after];
  const p = (time - start) / (end - start);
  return a.map((value, i) => value + (b[i] - value) * p);
}
const names = (await readdir(frames))
  .filter((name) => name.endsWith(".png"))
  .sort();
for (const [index, name] of names.entries()) {
  const c = contourAt(0.6 + index / 24).map(
    (value, i) => value + (i % 2 ? 5 : 8),
  );
  const mask = await sharp(
    Buffer.from(
      `<svg width="${frameWidth}" height="${frameHeight}" viewBox="0 0 960 540"><path fill="white" d="M0 0H960V${c[1]}H${c[0]}C${c.slice(2, 8).join(" ")}Q${c.slice(8).join(" ")}H0Z"/></svg>`,
    ),
  )
    .flatten({ background: "black" })
    .greyscale()
    .blur(1.2)
    .raw()
    .toBuffer();
  const source = await sharp(join(frames, name)).removeAlpha().raw().toBuffer();
  const data = Buffer.alloc(frameWidth * 2 * frameHeight * 3);
  for (let y = 0; y < frameHeight; y++) {
    for (let x = 0; x < frameWidth; x++) {
      const pixel = y * frameWidth + x;
      const a = mask[pixel] / 255;
      for (let channel = 0; channel < 3; channel++) {
        const value = source[pixel * 3 + channel];
        data[(y * frameWidth * 2 + x) * 3 + channel] = Math.round(value * a);
        data[(y * frameWidth * 2 + x + frameWidth) * 3 + channel] = Math.round(
          value * (1 - a),
        );
      }
    }
  }
  await sharp(data, {
    raw: { width: frameWidth * 2, height: frameHeight, channels: 3 },
  })
    .png()
    .toFile(join(atlas, name));
}
run([
  "-framerate",
  "24",
  "-i",
  join(atlas, "%03d.png"),
  "-vf",
  "setpts=PTS/1.16",
  "-r",
  "28",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "18",
  "-pix_fmt",
  "yuv420p",
  "-g",
  "28",
  "-an",
  "-movflags",
  "+faststart",
  "-y",
  "public/visuals/stylo-scoop-layers-v2.mp4",
]);

// Extract the largest golden silhouette from the existing neutral poster;
// fill its internal holes, then add very dark neutral relief without gold.
const { data: rgb, info } = await sharp(
  "public/visuals/stylo-lion-poster-v1.webp",
)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height } = info;
const count = width * height;
const pixels = new Uint8Array(count);
const visited = new Uint8Array(count);
const queue = new Int32Array(count);
let largest = [];
for (let i = 0; i < count; i++)
  pixels[i] = rgb[i * 3] > 30 && rgb[i * 3 + 1] > rgb[i * 3 + 2] * 1.08 ? 1 : 0;
for (let seed = 0; seed < count; seed++) {
  if (!pixels[seed] || visited[seed]) continue;
  let head = 0,
    tail = 1;
  queue[0] = seed;
  visited[seed] = 1;
  while (head < tail) {
    const i = queue[head++];
    for (const next of [
      i - width,
      i + width,
      i % width ? i - 1 : -1,
      i % width < width - 1 ? i + 1 : -1,
    ]) {
      if (next < 0 || next >= count || visited[next] || !pixels[next]) continue;
      visited[next] = 1;
      queue[tail++] = next;
    }
  }
  if (tail > largest.length) largest = Array.from(queue.subarray(0, tail));
}
const silhouette = Buffer.alloc(count);
for (const i of largest) silhouette[i] = 255;
visited.fill(0);
let head = 0,
  tail = 1;
queue[0] = 0;
visited[0] = 1;
while (head < tail) {
  const i = queue[head++];
  for (const next of [
    i - width,
    i + width,
    i % width ? i - 1 : -1,
    i % width < width - 1 ? i + 1 : -1,
  ]) {
    if (next < 0 || next >= count || visited[next] || silhouette[next])
      continue;
    visited[next] = 1;
    queue[tail++] = next;
  }
}
for (let i = 0; i < count; i++) if (!visited[i]) silhouette[i] = 255;
const alpha = await sharp(silhouette, { raw: { width, height, channels: 1 } })
  .blur(1)
  .greyscale()
  .raw()
  .toBuffer();
const soft = await sharp(silhouette, { raw: { width, height, channels: 1 } })
  .blur(9)
  .greyscale()
  .raw()
  .toBuffer();
const shadow = Buffer.alloc(count * 4);
for (let i = 0; i < count; i++) {
  const rim = 1 - soft[i] / 255;
  const relief =
    (rgb[i * 3] * 0.2126 + rgb[i * 3 + 1] * 0.7152 + rgb[i * 3 + 2] * 0.0722) *
    0.12;
  shadow[i * 4] = 12 + relief + rim * 50;
  shadow[i * 4 + 1] = 11 + relief + rim * 40;
  shadow[i * 4 + 2] = 9 + relief + rim * 25;
  shadow[i * 4 + 3] = alpha[i];
}
await sharp(shadow, { raw: { width, height, channels: 4 } })
  .webp({ lossless: true })
  .toFile("public/visuals/stylo-lion-shadow-v1.webp");
await writeFile(
  join(work, "preparation.json"),
  JSON.stringify(
    { frames: names.length, contours, trim: 0.6, speed: 1.16 },
    null,
    2,
  ),
);
console.log(`Prepared local intro atlas and shadow. Working files: ${work}`);
