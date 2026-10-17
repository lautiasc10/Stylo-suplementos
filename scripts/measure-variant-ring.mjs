// Production-only browser/React profiling. No catalog writes or checkout calls.
// npm run build -- --profile; npm run start -- --port 3200
// node scripts/measure-variant-ring.mjs before|ring|media|after [origin]
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const label = process.argv[2] ?? "before";
if (!/^[a-z-]+$/.test(label)) throw new Error("Invalid measurement label");
const origin = process.argv[3] ?? "http://127.0.0.1:3200";
const cpu = Number(process.env.PROFILE_CPU || 4);
if (!Number.isFinite(cpu) || cpu < 1 || cpu > 20)
  throw new Error("Invalid PROFILE_CPU");
const output = "docs/reviews/variant-ring-fase-3d";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => {
  window.__ringCommits = [];
  const committed = new WeakMap();
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject(renderer) {
      this.renderers.set(this.renderers.size + 1, renderer);
      return this.renderers.size;
    },
    onCommitFiberRoot(id, root) {
      const names = {};
      function visit(fiber) {
        if (!fiber) return;
        const props = fiber.memoizedProps;
        const name =
          props?.product && typeof props?.index === "number"
            ? "ProductCard"
            : props?.variants && ["compact", "full"].includes(props?.size)
              ? "VariantRing"
              : fiber.type?.displayName ||
                fiber.type?.name ||
                fiber.type?.type?.name;
        const previous =
          committed.get(fiber) ||
          (fiber.alternate && committed.get(fiber.alternate));
        const changed = !previous || previous.start !== fiber.actualStartTime;
        if (
          name &&
          changed &&
          (fiber.actualDuration ?? 0) > 0 &&
          fiber.flags & 1
        )
          names[name] = (names[name] || 0) + 1;
        const snapshot = { start: fiber.actualStartTime };
        committed.set(fiber, snapshot);
        if (fiber.alternate) committed.set(fiber.alternate, snapshot);
        visit(fiber.child);
        visit(fiber.sibling);
      }
      visit(root.current);
      window.__ringCommits.push({
        time: performance.now(),
        duration: root.current.actualDuration,
        names,
      });
    },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
  };
});
const cdp = await page.context().newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Performance.enable");
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
const imageRequests = new Map();
cdp.on("Network.responseReceived", ({ requestId, type, response }) => {
  if (type === "Image")
    imageRequests.set(requestId, {
      url: response.url.replace(origin, ""),
      bytes: 0,
      mime: response.mimeType,
    });
});
cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
  if (imageRequests.has(requestId))
    imageRequests.get(requestId).bytes = encodedDataLength;
});
const measurements = [];
function union(events) {
  const ranges = events
    .map((e) => [e.ts, e.ts + e.dur])
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    end = 0;
  for (const [a, b] of ranges) {
    total += Math.max(0, b - Math.max(a, end));
    end = Math.max(end, b);
  }
  return +(total / 1000).toFixed(2);
}
async function record(name, action) {
  const trace = [];
  const listener = ({ value }) => trace.push(...value);
  cdp.on("Tracing.dataCollected", listener);
  await cdp.send("Tracing.start", {
    categories:
      "devtools.timeline,v8.execute,blink.user_timing,disabled-by-default-devtools.timeline.frame",
    transferMode: "ReportEvents",
  });
  const metricsBefore = (await cdp.send("Performance.getMetrics")).metrics;
  const imageBefore = imageRequests.size;
  await page.evaluate(() => {
    window.__ringCommits = [];
    window.__ringFrames = [];
    window.__ringRecording = true;
    let last;
    function frame(now) {
      if (!window.__ringRecording) return;
      if (last) window.__ringFrames.push(now - last);
      last = now;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  await action();
  await page.waitForTimeout(350);
  const browserData = await page.evaluate(() => {
    window.__ringRecording = false;
    return { frames: window.__ringFrames, commits: window.__ringCommits };
  });
  const metricsAfter = (await cdp.send("Performance.getMetrics")).metrics;
  const completed = new Promise((resolve) =>
    cdp.once("Tracing.tracingComplete", resolve),
  );
  await cdp.send("Tracing.end");
  await completed;
  cdp.off("Tracing.dataCollected", listener);
  const metricDelta = (key) =>
    +(
      ((metricsAfter.find((m) => m.name === key)?.value ?? 0) -
        (metricsBefore.find((m) => m.name === key)?.value ?? 0)) *
      1000
    ).toFixed(2);
  const frames = browserData.frames.sort((a, b) => a - b);
  const rendererThread = trace.find(
    (e) => e.name === "thread_name" && e.args?.name === "CrRendererMain",
  );
  const events = trace.filter(
    (e) =>
      e.ph === "X" &&
      e.dur &&
      (!rendererThread || e.tid === rendererThread.tid),
  );
  const summary = {
    name,
    samples: frames.length,
    framesOver16ms: frames.filter((x) => x > 16).length,
    framesOver20ms: frames.filter((x) => x > 20).length,
    framesOver50ms: frames.filter((x) => x > 50).length,
    frameP95: +(frames[Math.floor(frames.length * 0.95)] ?? 0).toFixed(2),
    frameMax: +(frames.at(-1) ?? 0).toFixed(2),
    scriptingMs: metricDelta("ScriptDuration"),
    taskMs: metricDelta("TaskDuration"),
    paintMs: union(
      events.filter((e) =>
        ["Paint", "PrePaint", "CompositeLayers", "UpdateLayerTree"].includes(
          e.name,
        ),
      ),
    ),
    scriptingEventsOver16ms: events.filter(
      (e) =>
        [
          "FunctionCall",
          "EventDispatch",
          "FireAnimationFrame",
          "RunMicrotasks",
        ].includes(e.name) && e.dur > 16000,
    ).length,
    paintEventsOver16ms: events.filter(
      (e) => e.name === "Paint" && e.dur > 16000,
    ).length,
    newImageRequests: imageRequests.size - imageBefore,
    reactCommits: browserData.commits.length,
    reactDurationMs: +browserData.commits
      .reduce((n, c) => n + (c.duration ?? 0), 0)
      .toFixed(2),
    renderedComponents: browserData.commits.reduce((all, c) => {
      for (const [name, n] of Object.entries(c.names))
        all[name] = (all[name] ?? 0) + n;
      return all;
    }, {}),
  };
  measurements.push(summary);
  await writeFile(
    `${output}/${label}-${name}.trace.json.gz`,
    gzipSync(JSON.stringify({ traceEvents: trace })),
  );
  console.log(JSON.stringify(summary));
}
try {
  await page.goto(`${origin}/catalogo`);
  await page.locator(".product-card").first().waitFor();
  await page
    .locator(".product-frame-current")
    .first()
    .evaluate((i) => i.decode());
  await page.waitForTimeout(1500);
  const firstLoadImages = [...imageRequests.values()];
  await record("scroll", async () => {
    await page.evaluate(() => {
      window.__ringScroll = scrollY;
    });
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, 90);
      await page.waitForTimeout(22);
    }
  });
  const card = page
    .locator(".product-card")
    .filter({ has: page.locator(".variant-ring-count") })
    .first();
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await page.waitForTimeout(600);
  const stage = card.locator(".product-image-stage");
  const box = await stage.boundingBox();
  await record("hover", async () => {
    for (let i = 0; i < 80; i++) {
      await page.mouse.move(
        box.x + box.width * (0.5 + 0.35 * Math.sin(i / 10)),
        box.y + box.height * (0.5 + 0.3 * Math.cos(i / 9)),
      );
      await page.waitForTimeout(10);
    }
  });
  await record("card-change", async () => {
    await card
      .getByRole("button", { name: "Sabor siguiente", exact: true })
      .click();
    await page.waitForTimeout(1000);
  });
  const href = await card.locator("h2 a").getAttribute("href");
  await page.goto(`${origin}${href}`);
  const ring = page.locator(".variant-ring-full");
  await ring.locator(".product-frame-current").evaluate((i) => i.decode());
  await ring.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await record("detail-change", async () => {
    await ring
      .getByRole("button", { name: "Sabor siguiente", exact: true })
      .click();
    await page.waitForTimeout(1000);
  });
  const report = {
    label,
    method: `Chromium CDP Performance/Tracing; production next build --profile + next start; CPU ${cpu}x; 1440x1000 DPR1. Fresh browser context. React DevTools profiling hook. Timings are local lab measurements.`,
    at: new Date().toISOString(),
    measurements,
    firstLoadImageBytes: firstLoadImages.reduce((n, i) => n + i.bytes, 0),
    firstLoadImageRequests: firstLoadImages.length,
    imageBytesTotal: [...imageRequests.values()].reduce(
      (n, i) => n + i.bytes,
      0,
    ),
    images: [...imageRequests.values()],
    errors,
  };
  await writeFile(
    `${output}/${label}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      firstLoadImageBytes: report.firstLoadImageBytes,
      imageBytesTotal: report.imageBytesTotal,
      errors,
    }),
  );
} finally {
  await browser.close();
}
