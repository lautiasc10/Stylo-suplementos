// Extract the existing lion's left pose. No mirroring or generated artwork.
// Run with a local production server: node scripts/extract-reference-lion.mjs
import { chromium } from "@playwright/test";
import sharp from "sharp";

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(process.env.REVIEW_URL || "http://127.0.0.1:3101/");
  const source = await page.evaluate(async () => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = "/visuals/stylo-lion-motion-v3.mp4";
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });
    await new Promise((resolve) => {
      video.onseeked = resolve;
      video.currentTime = 3.45;
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await sharp(Buffer.from(source, "base64"))
    .webp({ quality: 90 })
    .toFile("public/visuals/stylo-lion-poster-left-v1.webp");
} finally {
  await browser.close();
}
