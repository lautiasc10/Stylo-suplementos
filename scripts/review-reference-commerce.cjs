// Production visual review. Cart additions affect only this temporary browser's
// cart cookie; no order is placed, payment created or stock reserved.
const { chromium, devices } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const origin = process.env.REVIEW_URL || "http://127.0.0.1:3101";
  const errors = [];
  const screenshots = [];
  const cdpMetrics = (r) =>
    Object.fromEntries(r.metrics.map((m) => [m.name, m.value]));
  try {
    for (const [name, options] of [
      ["desktop", { viewport: { width: 1440, height: 1000 } }],
      ["mobile", { ...devices["iPhone 13"] }],
    ]) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${origin}/catalogo`);
      await page.evaluate(() => document.fonts.ready);
      if (name === "desktop" && (await page.locator(".product-card").count())) {
        await page.locator(".product-card").first().hover();
        await page.waitForTimeout(750);
        const path = "docs/previews/referencia-3v-hover-desktop.webp";
        await page.screenshot({ path, type: "webp", quality: 85 });
        screenshots.push(path);
      }
      await page.locator(".search-trigger").click();
      const panel = page.locator(".reference-search-dialog");
      await panel.locator(".reference-search-row").first().waitFor();
      // Record the interaction after visible photos decode, rather than
      // conflating a cold remote image optimizer with the fly animation.
      await panel
        .locator(".reference-search-thumbnail img")
        .evaluateAll(async (images) => {
          const visible = images.filter(
            (img) => img.getBoundingClientRect().top < innerHeight * 0.65,
          );
          await Promise.race([
            Promise.allSettled(visible.map((img) => img.decode())),
            new Promise((resolve) => setTimeout(resolve, 8000)),
          ]);
        });
      await page.waitForTimeout(500);
      const searchPath = `docs/previews/referencia-3v-buscador-${name}.webp`;
      await page.screenshot({ path: searchPath, type: "webp", quality: 85 });
      screenshots.push(searchPath);
      const add = panel.locator(".add-to-cart button:not(:disabled)").first();
      if (await add.count()) {
        const session = await context.newCDPSession(page);
        await session.send("Performance.enable");
        const before = cdpMetrics(await session.send("Performance.getMetrics"));
        const [samples] = await Promise.all([
          page.evaluate(
            () =>
              new Promise((resolve) => {
                const samples = [];
                let last = 0;
                function frame(now) {
                  if (last) samples.push(now - last);
                  last = now;
                  if (samples.length < 90) requestAnimationFrame(frame);
                  else resolve(samples.sort((a, b) => a - b));
                }
                requestAnimationFrame(frame);
              }),
          ),
          add.click(),
        ]);
        const after = cdpMetrics(await session.send("Performance.getMetrics"));
        console.log(
          JSON.stringify({
            device: name,
            frames: samples.length,
            medianMs: samples[Math.floor(samples.length / 2)],
            p95Ms: samples[Math.floor(samples.length * 0.95)],
            over32ms: samples.filter((n) => n > 32).length,
            scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
            layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000,
            styleMs:
              (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
          }),
        );
        await page.locator(".cart-count").waitFor();
      }
      await page.keyboard.press("Escape");
      await panel.waitFor({ state: "hidden" });
      await page.locator(".cart-trigger").click();
      await page.waitForTimeout(600);
      const bagPath = `docs/previews/referencia-3v-bolsa-${name}.webp`;
      await page.screenshot({ path: bagPath, type: "webp", quality: 85 });
      screenshots.push(bagPath);
      await context.close();
    }
    console.log(JSON.stringify({ screenshots, errors }, null, 2));
    if (errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
