import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const label = process.argv[2] || "current";
if (!/^[a-z0-9-]{1,50}$/.test(label))
  throw new Error("Use a short report label with letters, digits and hyphens.");
const base = process.env.PROFILE_URL || "http://127.0.0.1:3002";
const cpu = Number(process.env.PROFILE_CPU || 4);
if (!Number.isFinite(cpu) || cpu < 1 || cpu > 20)
  throw new Error("PROFILE_CPU must be between 1 and 20.");
const throttledNetwork = process.env.PROFILE_NETWORK !== "off";
const browser = await chromium.launch();
const results = [];
try {
  for (const [view, width, height, route] of [
    [
      "desktop-detail",
      1868,
      980,
      "/producto/whey-protein?variante=2ec29ef4-abdf-4bc6-91cc-989de727bd05",
    ],
    [
      "mobile-detail",
      390,
      844,
      "/producto/whey-protein?variante=2ec29ef4-abdf-4bc6-91cc-989de727bd05",
    ],
    ["desktop-catalog", 1868, 980, "/catalogo"],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(45000);
    const session = await page.context().newCDPSession(page);
    await session.send("Network.enable");
    if (throttledNetwork)
      await session.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 80,
        downloadThroughput: 200000,
        uploadThroughput: 90000,
      });
    await session.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    const transfers = new Map();
    session.on("Network.responseReceived", ({ requestId, type, response }) => {
      transfers.set(requestId, {
        type,
        url: response.url.split("?")[0],
        bytes: 0,
      });
    });
    session.on(
      "Network.loadingFinished",
      ({ requestId, encodedDataLength }) => {
        const item = transfers.get(requestId);
        if (item) item.bytes = encodedDataLength;
      },
    );
    await page.addInitScript(() => {
      window.__profile = {
        tasks: [],
        frames: [],
        lcp: 0,
        cls: 0,
        sampling: false,
      };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          window.__profile.tasks.push({
            start: e.startTime,
            duration: e.duration,
          });
      }).observe({ type: "longtask", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__profile.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (!e.hadRecentInput) window.__profile.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    const started = Date.now();
    await page.goto(base + route, { waitUntil: "domcontentloaded" });
    await page.locator(".product-frame-current").first().waitFor();
    await page
      .locator(".product-frame-current")
      .first()
      .evaluate(async (image) => {
        if (!image.complete)
          await new Promise((resolve) =>
            image.addEventListener("load", resolve, { once: true }),
          );
        await image.decode();
      });
    await page.waitForTimeout(1800);
    const initial = await page.evaluate(() => ({
      lcpMs: Math.round(window.__profile.lcp),
      cls: window.__profile.cls,
      longTasks: window.__profile.tasks.length,
      totalBlockingMs: Math.round(
        window.__profile.tasks.reduce(
          (sum, t) => sum + Math.max(0, t.duration - 50),
          0,
        ),
      ),
      imageDimensions: [
        ...document.querySelectorAll(".product-frame-current"),
      ].map((i) => [i.naturalWidth, i.naturalHeight]),
    }));
    await page
      .locator(".product-image-gallery")
      .first()
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const profile = window.__profile;
      profile.sampling = true;
      let previous;
      const sample = (time) => {
        if (!profile.sampling) return;
        if (previous !== undefined) profile.frames.push(time - previous);
        previous = time;
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const clicks = [];
    if (route.includes("/producto/")) {
      for (let i = 0; i < 3; i++) {
        const flavor = await page
          .locator(".flavor-product-detail")
          .getAttribute("data-flavor");
        const start = await page.evaluate(() => performance.now());
        await page
          .getByRole("button", { name: "Sabor siguiente", exact: true })
          .click();
        await page.waitForFunction(
          (flavor) =>
            document.querySelector(".flavor-product-detail").dataset.flavor !==
            flavor,
          flavor,
        );
        clicks.push(
          Math.round(
            await page.evaluate((start) => performance.now() - start, start),
          ),
        );
        await page.waitForTimeout(1000);
      }
    } else {
      await page.locator(".product-card").nth(2).hover();
      await page.waitForTimeout(4000);
    }
    const animation = await page.evaluate(() => {
      window.__profile.sampling = false;
      const frames = window.__profile.frames.sort((a, b) => a - b);
      return {
        samples: frames.length,
        p95FrameMs: Number(
          (frames[Math.floor(frames.length * 0.95)] || 0).toFixed(1),
        ),
        framesOver34ms: frames.filter((t) => t > 34).length,
      };
    });
    const result = {
      view,
      cpuSlowdown: cpu,
      networkBytesPerSecond: throttledNetwork ? 200000 : null,
      latencyMs: throttledNetwork ? 80 : null,
      ...initial,
      ...animation,
      clickToVariantMs: clicks,
      wallTimeMs: Date.now() - started,
      imageTransfers: [...transfers.values()].filter(
        (t) => t.type === "Image" && t.bytes > 0,
      ),
    };
    results.push(result);
    console.log(JSON.stringify(result));
    await page.close();
  }
} finally {
  await browser.close();
}
await mkdir("docs/performance", { recursive: true });
await writeFile(
  `docs/performance/storefront-${label}.json`,
  JSON.stringify(results, null, 2) + "\n",
);
