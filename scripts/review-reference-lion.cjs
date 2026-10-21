// Read-only review against next build + next start. No catalog writes.
const { chromium, devices } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const url = process.env.REVIEW_URL || "http://127.0.0.1:3101/";
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.goto(url);
    await page
      .locator('.reference-lion-poses[data-left-ready="true"]')
      .waitFor();
    await page.waitForTimeout(1800);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const before = await cdp.send("Performance.getMetrics");
    const samples = await page.locator(".sport-hero").evaluate(async (hero) => {
      const samples = [];
      const bounds = hero.getBoundingClientRect();
      let last = 0;
      await new Promise((resolve) => {
        let i = 0;
        function tick(now) {
          if (last) samples.push(now - last);
          last = now;
          hero.dispatchEvent(
            new PointerEvent("pointermove", {
              clientX:
                bounds.left + bounds.width * (0.5 + Math.sin(i / 20) * 0.4),
              clientY: bounds.top + bounds.height * 0.4,
              pointerType: "mouse",
              bubbles: true,
            }),
          );
          if (++i <= 180) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
      return samples.sort((a, b) => a - b);
    });
    const after = await cdp.send("Performance.getMetrics");
    const a = Object.fromEntries(after.metrics.map((m) => [m.name, m.value]));
    const b = Object.fromEntries(before.metrics.map((m) => [m.name, m.value]));
    console.log(
      JSON.stringify(
        {
          frames: samples.length,
          medianMs: samples[Math.floor(samples.length * 0.5)],
          p95Ms: samples[Math.floor(samples.length * 0.95)],
          over32ms: samples.filter((v) => v > 32).length,
          scriptMs: (a.ScriptDuration - b.ScriptDuration) * 1000,
          layoutMs: (a.LayoutDuration - b.LayoutDuration) * 1000,
          styleMs: (a.RecalcStyleDuration - b.RecalcStyleDuration) * 1000,
          resources: await page.evaluate(() =>
            performance
              .getEntriesByType("resource")
              .filter((r) => /stylo-lion/.test(r.name))
              .map((r) => ({
                file: r.name.split("/").pop(),
                bytes: r.transferSize,
              })),
          ),
        },
        null,
        2,
      ),
    );
    for (const [side, x] of [
      ["left", 220],
      ["right", 1200],
    ]) {
      await page.mouse.move(x, 350);
      await page.waitForTimeout(1200);
      await page.locator(".sport-hero").screenshot({
        path: `docs/previews/referencia-3u-leon-${side}.png`,
      });
    }
    const mobile = await browser.newContext({ ...devices["iPhone 13"] });
    const phone = await mobile.newPage();
    await phone.goto(url);
    await phone.waitForTimeout(1800);
    await phone.locator(".sport-hero").screenshot({
      path: "docs/previews/referencia-3u-leon-mobile.png",
    });
    await mobile.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
