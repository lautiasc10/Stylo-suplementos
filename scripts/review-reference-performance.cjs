// Run against next start and a configured public catalog. Read-only browser check.
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(process.env.REVIEW_URL || "http://127.0.0.1:3101/", {
      waitUntil: "domcontentloaded",
    });
    await page
      .locator('.reference-showcase[data-scroll-enhanced="true"]')
      .waitFor();
    await page.locator('.reference-lion-poses[data-left-ready="true"]').waitFor();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const before = await cdp.send("Performance.getMetrics");
    const result = await page
      .locator(".reference-showcase")
      .evaluate(async (section) => {
        const start = scrollY + section.getBoundingClientRect().top;
        const distance = section.getBoundingClientRect().height - innerHeight;
        const samples = [];
        let last = 0;
        await new Promise((resolve) => {
          let step = 0;
          function tick(now) {
            if (last) samples.push(now - last);
            last = now;
            scrollTo({
              top: start + (distance * step) / 180,
              behavior: "instant",
            });
            if (++step <= 180) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
        samples.sort((a, b) => a - b);
        return {
          frames: samples.length,
          medianMs: samples[Math.floor(samples.length * 0.5)],
          p95Ms: samples[Math.floor(samples.length * 0.95)],
          over32ms: samples.filter((sample) => sample > 32).length,
          progress: section.style.getPropertyValue("--reference-progress"),
          imagesBytes: performance
            .getEntriesByType("resource")
            .filter((r) => r.initiatorType === "img")
            .reduce((sum, resource) => sum + resource.transferSize, 0),
        };
      });
    const after = await cdp.send("Performance.getMetrics");
    const a = Object.fromEntries(
      after.metrics.map((metric) => [metric.name, metric.value]),
    );
    const b = Object.fromEntries(
      before.metrics.map((metric) => [metric.name, metric.value]),
    );
    console.log(
      JSON.stringify(
        {
          ...result,
          scriptMs: 1000 * (a.ScriptDuration - b.ScriptDuration),
          layoutMs: 1000 * (a.LayoutDuration - b.LayoutDuration),
          styleMs: 1000 * (a.RecalcStyleDuration - b.RecalcStyleDuration),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
