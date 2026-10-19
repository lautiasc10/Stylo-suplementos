// Read-only production review. A fresh browser cart never creates an order.
// node scripts/audit-mobile-storefront.mjs [before|after] [baseURL]
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const label = process.argv[2] ?? "after";
if (!["before", "after"].includes(label))
  throw new Error("Expected before or after");
const base = process.argv[3] ?? "http://127.0.0.1:3218";
const output = `docs/reviews/mobile-storefront/${label}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: "chromium",
  args: ["--enable-gpu"],
});
const results = [];
const errors = [];

function unionMs(events) {
  const ranges = events
    .filter((event) => event.ph === "X" && event.dur > 0)
    .map((event) => [event.ts, event.ts + event.dur])
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    start = 0,
    end = 0;
  for (const range of ranges) {
    if (range[0] > end) {
      total += end - start;
      [start, end] = range;
    } else end = Math.max(end, range[1]);
  }
  return Number(((total + end - start) / 1000).toFixed(2));
}

async function trace(page, action) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Tracing.start", {
    categories:
      "devtools.timeline,blink.user_timing,v8,disabled-by-default-devtools.timeline",
    transferMode: "ReturnAsStream",
  });
  await page.evaluate(() => {
    window.__mobileFrames = [];
    window.__mobileSampling = true;
    let previous;
    const sample = (now) => {
      if (!window.__mobileSampling) return;
      if (previous) window.__mobileFrames.push(now - previous);
      previous = now;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await action();
  const frames = await page.evaluate(() => {
    window.__mobileSampling = false;
    const frames = window.__mobileFrames.sort((a, b) => a - b);
    return {
      samples: frames.length,
      p95Ms: Number((frames[Math.floor(frames.length * 0.95)] ?? 0).toFixed(2)),
      maxMs: Number((frames.at(-1) ?? 0).toFixed(2)),
      over16ms: frames.filter((gap) => gap > 16.7).length,
      over32ms: frames.filter((gap) => gap > 32).length,
    };
  });
  const complete = new Promise((resolve) =>
    cdp.once("Tracing.tracingComplete", resolve),
  );
  await cdp.send("Tracing.end");
  const { stream } = await complete;
  let json = "";
  for (;;) {
    const part = await cdp.send("IO.read", { handle: stream });
    json += part.data;
    if (part.eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  const events = JSON.parse(json).traceEvents;
  const main = events.find(
    (event) =>
      event.name === "thread_name" && event.args?.name === "CrRendererMain",
  );
  const thread = events.filter(
    (event) => event.pid === main?.pid && event.tid === main?.tid,
  );
  return {
    ...frames,
    scriptingMs: unionMs(
      thread.filter((event) =>
        [
          "FunctionCall",
          "EvaluateScript",
          "RunMicrotasks",
          "EventDispatch",
        ].includes(event.name),
      ),
    ),
    paintMs: unionMs(
      thread.filter((event) => ["Paint", "PrePaint"].includes(event.name)),
    ),
    layoutMs: unionMs(
      thread.filter((event) =>
        ["Layout", "UpdateLayoutTree"].includes(event.name),
      ),
    ),
    longTasks: thread
      .filter(
        (event) =>
          event.name.endsWith("RunTask") &&
          event.ph === "X" &&
          event.dur > 50000,
      )
      .map((event) => Number((event.dur / 1000).toFixed(2))),
  };
}

async function shot(page, name, width) {
  await page.evaluate(() => document.fonts.ready);
  await sharp(await page.screenshot())
    .webp({ quality: 82 })
    .toFile(`${output}/${name}-${width}.webp`);
}

async function inspect(page, name, width) {
  return page.evaluate(
    ({ name, width }) => ({
      name,
      width,
      overflow: document.documentElement.scrollWidth > innerWidth,
      clippedHeadings: [...document.querySelectorAll("h1, h2")]
        .filter(
          (heading) =>
            heading.clientWidth > 2 &&
            heading.scrollWidth > heading.clientWidth + 1,
        )
        .map((heading) => heading.textContent.trim()),
      transparentVisibleCards: [...document.querySelectorAll(".product-card")]
        .filter((card) => {
          const bounds = card.getBoundingClientRect();
          if (bounds.top >= innerHeight - 80 || bounds.bottom <= 0)
            return false;
          let element = card;
          while (element) {
            if (Number(getComputedStyle(element).opacity) < 0.5) return true;
            element = element.parentElement;
          }
          return false;
        })
        .map((card) => card.querySelector("h2")?.textContent.trim()),
      brokenImages: [...document.images]
        .filter(
          (image) =>
            image.complete &&
            image.naturalWidth === 0 &&
            image.getBoundingClientRect().width > 0,
        )
        .map((image) => image.alt),
      smallInputs: [
        ...document.querySelectorAll(
          "input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea",
        ),
      ]
        .filter(
          (input) =>
            input.getBoundingClientRect().width > 0 &&
            parseFloat(getComputedStyle(input).fontSize) < 16,
        )
        .map(
          (input) => input.getAttribute("aria-label") || input.name || input.id,
        ),
      badges: [...document.querySelectorAll(".product-card-labels")]
        .slice(0, 6)
        .map((root) => ({
          cardWidth: root.closest(".product-card").getBoundingClientRect()
            .width,
          labels: [...root.children].map((element) => ({
            text: element.textContent.trim(),
            width: element.getBoundingClientRect().width,
            height: element.getBoundingClientRect().height,
            clipped: element.scrollWidth > element.clientWidth + 1,
          })),
        })),
    }),
    { name, width },
  );
}

try {
  for (const width of [375, 390, 768]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(40000);
    page.on("pageerror", (error) =>
      errors.push({ width, message: error.message }),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        errors.push({ width, message: message.text() });
    });
    const cdp = await context.newCDPSession(page);
    const images = new Map();
    await cdp.send("Network.enable");
    cdp.on("Network.responseReceived", ({ requestId, type }) => {
      if (type === "Image") images.set(requestId, 0);
    });
    cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
      if (images.has(requestId)) images.set(requestId, encodedDataLength);
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    for (const [name, route] of [
      ["home", "/"],
      ["catalogo", "/catalogo"],
      ["etiquetas", "/catalogo?q=mutant"],
      ["resultados", "/buscar?q=creatina"],
      [
        "sin-sabor",
        "/producto/star-nutrition-zinc-magnesio-vitamina-b6-zma-x-90-caps",
      ],
      ["con-sabor", "/producto/onefit-aminoacidos-eeaa-essential-amino-acid"],
      ["nosotros", "/nosotros"],
      ["contacto", "/contacto"],
    ]) {
      const imageStart = [...images.values()].reduce(
        (sum, bytes) => sum + bytes,
        0,
      );
      const response = await page.goto(base + route, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(450);
      const state = await inspect(page, name, width);
      state.status = response.status();
      if (name === "catalogo") {
        state.scroll = await trace(page, async () => {
          await page.evaluate(
            () =>
              new Promise((resolve) => {
                const start = performance.now();
                const tick = (now) => {
                  const t = Math.min(1, (now - start) / 1800);
                  scrollTo(0, Math.sin(t * Math.PI) * 2100);
                  if (t < 1) requestAnimationFrame(tick);
                  else resolve();
                };
                requestAnimationFrame(tick);
              }),
          );
          await page.waitForTimeout(300);
        });
        await page.locator(".catalog-panel-toggle").click();
        await page.locator(".catalog-filter-group summary").first().click();
        await shot(page, "filtros", width);
        state.openFilters = await page
          .locator(".catalog-sidebar")
          .evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            return {
              top: bounds.top,
              height: bounds.height,
              visibleFraction: bounds.height / innerHeight,
              position: getComputedStyle(element).position,
            };
          });
        const closeFilters = page.getByRole("button", {
          name: "Cerrar filtros",
          exact: true,
        });
        if (await closeFilters.isVisible()) await closeFilters.click();
        else await page.locator(".catalog-panel-toggle").click();
        await page
          .getByRole("link", { name: "Buscar productos", exact: true })
          .click();
        const input = page.getByRole("combobox", { name: "Buscar productos" });
        state.search = await trace(page, async () => {
          await input.fill("whey");
          await page
            .locator('.search-dialog [role="option"]')
            .first()
            .waitFor();
          await page.waitForTimeout(350);
        });
        await shot(page, "buscador", width);
        await page.keyboard.press("Escape");
      }
      if (name === "con-sabor") {
        state.variantChange = await trace(page, async () => {
          await page
            .getByRole("button", { name: "Sabor siguiente", exact: true })
            .click();
          await page.waitForTimeout(1150);
        });
      }
      await shot(page, name, width);
      if (name === "home") {
        const menu = page.locator(".mobile-menu > summary");
        await menu.click();
        await page.waitForTimeout(250);
        await shot(page, "menu", width);
        await page.keyboard.press("Escape");
      }
      state.imageNetworkBytes =
        [...images.values()].reduce((sum, bytes) => sum + bytes, 0) -
        imageStart;
      results.push(state);
      console.log(`${label}: ${name} ${width}px`);
    }
    await page.goto(
      base + "/producto/onefit-creatina-micronizada-poweraded-x-200gr",
      { waitUntil: "networkidle" },
    );
    await page
      .getByRole("button", { name: "Agregar al carrito", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await shot(page, "carrito-panel", width);
    await page.keyboard.press("Escape");
    await page.goto(base + "/carrito", { waitUntil: "networkidle" });
    await shot(page, "carrito", width);
    results.push(await inspect(page, "carrito", width));
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${output}/verificacion.json`,
  JSON.stringify(
    {
      note: "Production build, Chromium GPU, CPU x4, emulated mobile sizes. Short local trace/RAF samples are not field INP, and do not establish performance on a physical phone. Scripting/paint/layout are unions of main-thread intervals, not sums of nested events.",
      results,
      errors,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      routes: results.length,
      errors,
      overflow: results
        .filter((result) => result.overflow)
        .map(({ name, width }) => ({ name, width })),
    },
    null,
    2,
  ),
);
