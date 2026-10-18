// Read-only production QA: npm.cmd run build && npm.cmd run start -- --port 3200
// node scripts/measure-flavor-choreography.mjs [baseURL] [output-directory]
import { chromium } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:3200";
const output = path.resolve(
  process.argv[3] ?? "docs/reviews/coreografia-sabores",
);
const slug = "star-nutrition-proteina-whey-protein-x-2-lbs-dp";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: "chromium",
  args: ["--enable-gpu"],
});
const browserClient = await browser.newBrowserCDPSession();
const system = await browserClient.send("SystemInfo.getInfo");
const results = [];
try {
  for (const scenario of [
    { name: "desktop-siguiente", width: 1440, direction: 1 },
    { name: "desktop-anterior", width: 1440, direction: -1 },
    { name: "mobile-swipe", width: 375, direction: 1 },
    { name: "mobile-reducido", width: 375, direction: 1, reduced: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: 900 },
      hasTouch: scenario.width < 800,
      isMobile: scenario.width < 800,
      reducedMotion: scenario.reduced ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/producto/${slug}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator('.product-detail[data-choreography="true"]');
    const gallery = page.locator(".flavor-hero-gallery");
    await gallery.scrollIntoViewIfNeeded();
    await gallery.dispatchEvent("pointerenter");
    await page.waitForTimeout(500);
    await page.evaluate(() =>
      Promise.all(
        [
          ...document.querySelectorAll(
            ".flavor-hero-gallery img, .flavor-scene-decorations img",
          ),
        ].map((image) => image.decode().catch(() => {})),
      ),
    );
    const before = await hero.screenshot();
    await sharp(before)
      .webp({ quality: 82 })
      .toFile(path.join(output, `${scenario.name}-antes.webp`));
    await page.evaluate(() => {
      const root = document.querySelector(
        '.product-detail[data-choreography="true"]',
      );
      const state = {
        gaps: [],
        overlaps: 0,
        maximumBackgrounds: 0,
        maximumPacks: 0,
        shifts: [],
        completed: false,
        baseline: performance.getEntriesByName("stylo:flavor-transition")
          .length,
      };
      window.__flavorQA = state;
      const observer = new PerformanceObserver((list) =>
        state.shifts.push(
          ...list.getEntries().map((entry) => ({
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
          })),
        ),
      );
      observer.observe({ type: "layout-shift", buffered: false });
      let previous;
      const started = performance.now();
      const tick = (now) => {
        if (previous !== undefined) state.gaps.push(now - previous);
        previous = now;
        const packs = [...root.querySelectorAll(".flavor-hero-pack")];
        if (
          packs.filter((pack) => Number(getComputedStyle(pack).opacity) > 0.001)
            .length > 1
        )
          state.overlaps++;
        state.maximumPacks = Math.max(state.maximumPacks, packs.length);
        state.maximumBackgrounds = Math.max(
          state.maximumBackgrounds,
          root.querySelectorAll(".flavor-hero-background").length,
        );
        if (now - started < 1250) requestAnimationFrame(tick);
        else {
          state.completed = true;
          observer.disconnect();
        }
      };
      requestAnimationFrame(tick);
    });
    const client = await page.context().newCDPSession(page);
    await client.send("Performance.enable");
    const cpuBefore = await client.send("Performance.getMetrics");
    if (scenario.name === "mobile-swipe") {
      const stage = gallery.locator(".product-image-stage");
      await stage.dispatchEvent("pointerdown", {
        pointerType: "touch",
        isPrimary: true,
        clientX: 280,
        clientY: 240,
      });
      await stage.dispatchEvent("pointerup", {
        pointerType: "touch",
        isPrimary: true,
        clientX: 80,
        clientY: 245,
      });
    } else {
      await gallery
        .getByRole("button", {
          name: scenario.direction > 0 ? "Sabor siguiente" : "Sabor anterior",
          exact: true,
        })
        .click();
    }
    await page.waitForFunction(() => window.__flavorQA.completed);
    const cpuAfter = await client.send("Performance.getMetrics");
    const result = await page.evaluate(() => {
      const state = window.__flavorQA;
      const transitions = performance
        .getEntriesByName("stylo:flavor-transition")
        .slice(state.baseline)
        .map((entry) => entry.detail);
      const gaps = state.gaps;
      const sorted = [...gaps].sort((a, b) => a - b);
      return {
        transitions,
        sampledFrames: gaps.length,
        framesOver20: gaps.filter((gap) => gap > 20).length,
        maxFrame: Math.max(...gaps),
        p95Frame: sorted[Math.floor(sorted.length * 0.95)],
        doubleExposureFrames: state.overlaps,
        maximumPacks: state.maximumPacks,
        maximumBackgrounds: state.maximumBackgrounds,
        cls: state.shifts
          .filter((entry) => !entry.hadRecentInput)
          .reduce((sum, entry) => sum + entry.value, 0),
        layoutShiftIncludingInput: state.shifts.reduce(
          (sum, entry) => sum + entry.value,
          0,
        ),
        imageBytes: performance
          .getEntriesByType("resource")
          .filter((entry) => entry.initiatorType === "img")
          .reduce((sum, entry) => sum + entry.encodedBodySize, 0),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    const delta = (name) =>
      ((cpuAfter.metrics.find((metric) => metric.name === name)?.value ?? 0) -
        (cpuBefore.metrics.find((metric) => metric.name === name)?.value ??
          0)) *
      1000;
    const record = {
      scenario: scenario.name,
      ...result,
      scriptingMs: delta("ScriptDuration"),
      layoutMs: delta("LayoutDuration"),
      styleMs: delta("RecalcStyleDuration"),
      errors,
    };
    results.push(record);
    console.log(JSON.stringify(record));
    await sharp(await hero.screenshot())
      .webp({ quality: 82 })
      .toFile(path.join(output, `${scenario.name}-despues.webp`));
    await context.close();
  }
} finally {
  await browser.close();
}
await fs.writeFile(
  path.join(output, "mediciones.json"),
  JSON.stringify(
    {
      productionURL: base,
      slug,
      device:
        "Production Chromium with GPU enabled, DPR 1; mobile viewport emulated",
      gpu: {
        renderer: system.gpu.auxAttributes.glRenderer,
        compositing: system.gpu.featureStatus.gpu_compositing,
        rasterization: system.gpu.featureStatus.rasterization,
      },
      scenarios: results,
    },
    null,
    2,
  ),
);
