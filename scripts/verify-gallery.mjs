// Reads public pages and local derivatives only. Never submits a purchase or admin form.
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import assert from "node:assert/strict";
const [snapshotFile, work] = process.argv.slice(2);
const snapshot = JSON.parse(await readFile(snapshotFile, "utf8"));
const report = JSON.parse(
  await readFile("public/media/products-normalized-v2/report.json", "utf8"),
);
const output = "docs/reviews/variant-ring-fase-3d";
const result = {
  imageCount: 0,
  originalsUnchanged: true,
  errors: [],
  views: [],
  thumbnails: [],
};
for (const record of report.records) {
  const original = await readFile(
    path.join(work, "originals", path.basename(record.sourcePath)),
  );
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    record.sourceHash,
  );
  const file = `public/media/products-normalized-v2/${record.outputs[1000].filename}`;
  const metadata = await sharp(file).metadata();
  assert.equal(metadata.width, 1000);
  assert.equal(metadata.height, 1000);
  assert(metadata.hasAlpha);
  result.imageCount++;
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  page.on("pageerror", (e) => result.errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") result.errors.push(e.text());
  });
  for (const width of [1800, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://127.0.0.1:3200/catalogo");
    await page.locator(".product-card").first().waitFor();
    await page
      .locator(".product-frame-current")
      .first()
      .evaluate((i) => i.decode());
    if (width < 960) {
      const panel = page.locator(".catalog-filter-panel");
      if (await panel.evaluate((e) => e.open))
        await panel.locator(":scope>summary").click();
    }
    await page.locator(".product-card").first().scrollIntoViewIfNeeded();
    const state = await page.evaluate(() => ({
      kind: "catalog",
      width: innerWidth,
      cards: document.querySelectorAll(".product-card").length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      columns: getComputedStyle(
        document.querySelector(".product-grid"),
      ).gridTemplateColumns.split(" ").length,
      placeholderBackground: getComputedStyle(
        document.querySelector(".product-placeholder"),
      ).backgroundImage,
      placeholderColor: getComputedStyle(
        document.querySelector(".product-placeholder"),
      ).color,
    }));
    assert(!state.overflow);
    assert.equal(state.cards, 53);
    assert.match(state.placeholderBackground, /rock-square/);
    result.views.push(state);
    await page.screenshot({ path: `${output}/catalogo-${width}.png` });
    for (const sku of [
      "STAR-0023",
      snapshot.catalog.products.find((p) => p.name.includes("EEAA")).variants[0]
        .sku,
    ]) {
      const product = snapshot.catalog.products.find((p) =>
        p.variants.some((v) => v.sku === sku),
      );
      if (!product) continue;
      await page.goto(`http://127.0.0.1:3200/producto/${product.slug}`);
      const ring = page.locator(".variant-ring-full");
      await ring.locator(".product-frame-current").evaluate((i) => i.decode());
      await page.evaluate(() => scrollTo(0, 0));
      const layout = await ring.evaluate((root) => ({
        kind: "detail",
        width: innerWidth,
        overflow: document.documentElement.scrollWidth > innerWidth,
        stageWidth: root.querySelector(".product-image-stage").clientWidth,
        stageHeight: root.querySelector(".product-image-stage").clientHeight,
        imageWidth: root.querySelector(".product-frame-current").naturalWidth,
        imageSource: root
          .querySelector(".product-frame-current")
          .currentSrc.replace(location.origin, ""),
      }));
      assert(!layout.overflow);
      assert.equal(layout.stageWidth, layout.stageHeight);
      assert(layout.imageWidth <= 1000);
      result.views.push({ ...layout, sku });
      if (sku === "STAR-0023")
        await page.screenshot({ path: `${output}/producto-${width}.png` });
      const last = ring.locator(".product-thumbnail-viewport a").last();
      await last.click();
      await page.waitForFunction(
        () =>
          document.querySelector(".variant-ring")?.dataset.ringPhase === "idle",
      );
      const thumbnail = await ring.evaluate((root) => {
        const active = root.querySelector(
          ".variant-ring-item[data-current=true]",
        );
        const pack = active.querySelector(".variant-ring-tilt");
        return {
          width: innerWidth,
          framed: active.dataset.framed === "true",
          alt: active.querySelector("img").alt,
          background: getComputedStyle(pack).backgroundColor,
          border: getComputedStyle(pack).borderTopColor,
          opacity: getComputedStyle(active).opacity,
        };
      });
      assert(thumbnail.framed);
      assert.notEqual(thumbnail.background, "rgb(255, 255, 255)");
      assert.equal(thumbnail.opacity, "1");
      result.thumbnails.push({ ...thumbnail, sku });
      await ring
        .locator(".product-image-stage")
        .screenshot({ path: `${output}/etiqueta-${sku}-${width}.png` });
    }
  }
  // A normal-motion screenshot with visible neighbors, then inspect clipping and hint release.
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const product = snapshot.catalog.products.find((p) =>
    p.variants.some((v) => v.sku === "STAR-0023"),
  );
  await page.goto(`http://127.0.0.1:3200/producto/${product.slug}`);
  await page.locator(".product-frame-current").evaluate((i) => i.decode());
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${output}/anillo-escritorio.png` });
  assert.deepEqual(result.errors, []);
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      images: result.imageCount,
      originalsUnchanged: true,
      views: result.views.length,
      labels: result.thumbnails.length,
      errors: result.errors,
    }),
  );
} finally {
  await browser.close();
}
