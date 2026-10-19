// Read-only review against a production build; never submits the real cart.
// node scripts/review-neutral-products.mjs http://127.0.0.1:3216
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const base = process.argv[2] ?? "http://127.0.0.1:3216";
const output = "docs/reviews/fichas-sin-sabor";
const products = [
  ["creatina", "onefit-creatina-micronizada-poweraded-x-200gr"],
  ["zma", "xbody-zinc-magnesio-vitamina-b6-zma-90-capsulas"],
  ["cafeina", "star-nutrition-cafeina-200-x-30-caps"],
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: "chromium",
  args: ["--enable-gpu"],
});
const results = [];

async function sample(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const gaps = [];
        const clsBefore = window.__neutralQA.cls;
        const taskCount = window.__neutralQA.longTasks.length;
        let start, previous;
        const tick = (now) => {
          start ??= now;
          if (previous) gaps.push(now - previous);
          previous = now;
          if (now - start < 1600) return requestAnimationFrame(tick);
          gaps.sort((a, b) => a - b);
          resolve({
            samples: gaps.length,
            medianMs: Number(gaps[Math.floor(gaps.length / 2)].toFixed(2)),
            p95Ms: Number(gaps[Math.floor(gaps.length * 0.95)].toFixed(2)),
            maxMs: Number(gaps.at(-1).toFixed(2)),
            over32ms: gaps.filter((gap) => gap > 32).length,
            cls: window.__neutralQA.cls - clsBefore,
            longTasks: window.__neutralQA.longTasks.slice(taskCount),
          });
        };
        requestAnimationFrame(tick);
      }),
  );
}

try {
  for (const width of [1440, 375, 768]) {
    for (const [name, slug] of products) {
      if (width === 768 && name !== "creatina") continue;
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 812 : 950 },
        isMobile: width < 800,
        hasTouch: width < 800,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.addInitScript(() => {
        window.__neutralQA = { cls: 0, longTasks: [] };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if (!entry.hadRecentInput) window.__neutralQA.cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          window.__neutralQA.longTasks.push(
            ...list.getEntries().map((entry) => entry.duration),
          );
        }).observe({ type: "longtask", buffered: true });
      });
      const cdp = await context.newCDPSession(page);
      const imageTransfers = new Map();
      await cdp.send("Network.enable");
      cdp.on("Network.responseReceived", ({ requestId, type }) => {
        if (type === "Image") imageTransfers.set(requestId, 0);
      });
      cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
        if (imageTransfers.has(requestId))
          imageTransfers.set(requestId, encodedDataLength);
      });
      const imageBytes = () =>
        [...imageTransfers.values()].reduce((sum, bytes) => sum + bytes, 0);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const response = await page.goto(`${base}/producto/${slug}`, {
        waitUntil: "networkidle",
      });
      const initialImageNetworkBytes = imageBytes();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.querySelectorAll(".product-gallery img")].map((img) =>
            img.decode().catch(() => {}),
          ),
        );
      });
      // Same page and hardware: compare the old static gallery with the trial
      // enabled. These RAF intervals are local lab samples, not field INP/FPS.
      await page.evaluate(() => {
        document
          .querySelector(".product-detail")
          .classList.remove("neutral-product-detail");
        document.querySelector(".neutral-product-scene").style.display = "none";
      });
      await page.waitForTimeout(500);
      const baseline = await sample(page);
      const baselineImageBytes = imageBytes();
      await page.evaluate(() => {
        document
          .querySelector(".product-detail")
          .classList.add("neutral-product-detail");
        const scene = document.querySelector(".neutral-product-scene");
        scene.style.display = "";
        scene.removeAttribute("data-settled");
      });
      const trial = await sample(page);
      const metrics = await page.evaluate(() => ({
        ...window.__neutralQA,
        overflow: document.documentElement.scrollWidth > innerWidth,
        title: document.querySelector("h1").textContent,
        photo: [
          ...document.querySelectorAll(
            ".product-gallery .product-frame-current",
          ),
        ].map((img) => ({
          complete: img.complete,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })),
        ambientImageRequests: document.querySelectorAll(
          ".neutral-product-scene img, .neutral-product-scene canvas",
        ).length,
        purchaseVisible: (() => {
          const bounds = document
            .querySelector(".purchase-action")
            .getBoundingClientRect();
          return bounds.top < innerHeight && bounds.bottom > 0;
        })(),
      }));
      await sharp(await page.screenshot())
        .webp({ quality: 85 })
        .toFile(`${output}/${name}-${width}.webp`);
      results.push({
        name,
        width,
        status: response.status(),
        cpuSlowdown: 4,
        baseline,
        trial,
        initialImageNetworkBytes,
        trialAddedImageBytes: imageBytes() - baselineImageBytes,
        ...metrics,
        errors,
      });
      console.log(`Reviewed ${name} at ${width}px`);
      await context.close();
    }
  }
  for (const mode of ["sin-javascript", "movimiento-reducido"]) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      javaScriptEnabled: mode !== "sin-javascript",
      reducedMotion:
        mode === "movimiento-reducido" ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    await page.goto(`${base}/producto/${products[0][1]}`, {
      waitUntil: "networkidle",
    });
    const state = await page.evaluate(() => ({
      scene: Boolean(document.querySelector(".neutral-product-scene")),
      motion: document
        .querySelector(".neutral-product-scene")
        .getAttribute("data-motion"),
      photo: document.querySelector(".product-frame-current").complete,
      animation: getComputedStyle(
        document.querySelector(".neutral-scene-particles-near"),
      ).animationName,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    await sharp(await page.screenshot())
      .webp({ quality: 85 })
      .toFile(`${output}/${mode}-375.webp`);
    results.push({ mode, ...state });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${output}/verificacion.json`,
  JSON.stringify(
    {
      note: "Production build, CPU x4, same-page static/trial comparison. Short local RAF samples do not establish field INP or universal 60fps. No external images added by this scene.",
      results,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    results.map(({ name, width, baseline, trial, errors, mode, overflow }) => ({
      name,
      width,
      baseline,
      trial,
      errors,
      mode,
      overflow,
    })),
    null,
    2,
  ),
);
