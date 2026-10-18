// Production visual recording. CDP supplies timestamped compositor frames;
// resampling to 60fps may repeat a captured frame. Use the separate measurement
// script for actual frame pacing; video capture itself adds overhead.
import { chromium } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const base = process.argv[2] ?? "http://127.0.0.1:3200";
const output = path.resolve(
  process.argv[3] ?? "docs/reviews/coreografia-sabores",
);
await fs.mkdir(output, { recursive: true });
const temporary = await fs.mkdtemp(
  path.join(os.tmpdir(), "stylo-flavor-recording-"),
);
const browser = await chromium.launch({
  channel: "chromium",
  args: ["--enable-gpu"],
});
let frames = [],
  clicked;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(
    `${base}/producto/star-nutrition-proteina-whey-protein-x-2-lbs-dp`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(() => document.fonts.ready);
  const chip = page.locator('.variant-chip[data-flavor="frutilla"]');
  await chip.hover();
  await page.waitForTimeout(700);
  await chip.evaluate((element) =>
    element.addEventListener(
      "click",
      () => {
        window.__flavorClickedAt = Date.now() / 1000;
      },
      { once: true },
    ),
  );
  const client = await page.context().newCDPSession(page);
  await client.send("Page.enable");
  client.on("Page.screencastFrame", (frame) => {
    frames.push({
      timestamp: frame.metadata.timestamp,
      bytes: Buffer.from(frame.data, "base64"),
    });
    void client
      .send("Page.screencastFrameAck", { sessionId: frame.sessionId })
      .catch(() => {});
  });
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    everyNthFrame: 1,
    maxWidth: 1440,
    maxHeight: 900,
  });
  await page.waitForTimeout(200);
  await chip.click();
  await page.waitForTimeout(1400);
  clicked = await page.evaluate(() => window.__flavorClickedAt);
  await client.send("Page.stopScreencast");
} finally {
  await browser.close();
}
frames.sort((a, b) => a.timestamp - b.timestamp);
if (!frames.length) throw new Error("No compositor frames were captured");
const start = frames[0].timestamp;
const end = Math.max(frames.at(-1).timestamp, clicked + 1.15);
let sourceIndex = 0;
const frameCount = Math.ceil((end - start) * 60);
const encodedFrames = [];
for (let i = 0; i < frameCount; i++) {
  const time = start + i / 60;
  while (
    sourceIndex + 1 < frames.length &&
    frames[sourceIndex + 1].timestamp <= time
  )
    sourceIndex++;
  await fs.writeFile(
    path.join(temporary, `frame_${String(i).padStart(3, "0")}.jpg`),
    frames[sourceIndex].bytes,
  );
  encodedFrames.push(frames[sourceIndex].bytes);
}
const binaries = path.join(process.env.LOCALAPPDATA, "ms-playwright");
const versions = (await fs.readdir(binaries))
  .filter((entry) => entry.startsWith("ffmpeg-"))
  .sort()
  .reverse();
const ffmpeg =
  process.env.FFMPEG_PATH ??
  path.join(binaries, versions[0], "ffmpeg-win64.exe");
const result = spawnSync(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-r",
    "60",
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "-i",
    "pipe:0",
    "-c:v",
    "libvpx-vp9",
    "-deadline",
    "good",
    "-cpu-used",
    "4",
    "-crf",
    "30",
    "-b:v",
    "0",
    "-pix_fmt",
    "yuv420p",
    path.join(output, "cambio-sabor-60fps.webm"),
  ],
  { encoding: "utf8", windowsHide: true, input: Buffer.concat(encodedFrames) },
);
if (result.status !== 0) throw new Error(result.stderr);
const moments = [0, 140, 260, 400, 560, 850, 960];
for (const ms of moments) {
  const target = clicked + ms / 1000;
  const frame = frames.reduce((best, candidate) =>
    Math.abs(candidate.timestamp - target) < Math.abs(best.timestamp - target)
      ? candidate
      : best,
  );
  await sharp(frame.bytes)
    .webp({ quality: 85 })
    .toFile(
      path.join(output, `secuencia-${String(ms).padStart(3, "0")}ms.webp`),
    );
}
const gaps = frames
  .slice(1)
  .map((frame, i) => (frame.timestamp - frames[i].timestamp) * 1000);
const activeFrames = frames.filter(
  (frame) => frame.timestamp >= clicked && frame.timestamp <= clicked + 0.96,
);
const activeGaps = activeFrames
  .slice(1)
  .map((frame, i) => (frame.timestamp - activeFrames[i].timestamp) * 1000);
const report = {
  encodedFps: 60,
  capturedFrames: frames.length,
  encodedFrames: frameCount,
  duration: frameCount / 60,
  sourceCaptureMaxGapMs: Math.max(...gaps),
  motionCaptureFrames: activeFrames.length,
  motionCaptureMaxGapMs: Math.max(...activeGaps),
  method:
    "CDP compositor recording resampled by timestamps; repeated frames are possible. Actual pacing is measured separately without recording.",
};
await fs.writeFile(
  path.join(output, "grabacion.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
