import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { orderDate } from "../../src/modules/admin/order-date";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("Node y Chrome muestran exactamente la misma fecha de pedido aunque cambie la zona del dispositivo", async ({ browser }) => {
  const source = ts.transpileModule(readFileSync("src/modules/admin/order-date.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const timestamps = ["2026-10-23T00:00:36Z", "2027-01-01T03:00:00Z"];
  const expected = timestamps.map(orderDate);
  for (const timezoneId of ["UTC", "America/Los_Angeles"]) {
    const context = await browser.newContext({ timezoneId });
    try {
      const page = await context.newPage();
      const actual = await page.evaluate(({ source, timestamps }) => {
        const exports = {} as { orderDate: (timestamp: string) => { date: string; time: string } };
        new Function("exports", source)(exports);
        return timestamps.map(exports.orderDate);
      }, { source, timestamps });
      expect(actual).toEqual(expected);
    } finally {
      await context.close();
    }
  }
});

test("el panel de filtros conserva su nombre y su formulario al pasar de escritorio a móvil", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/vista-previa");
  const dialog = page.getByRole("dialog", { name: "Filtrar y ordenar", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute("aria-modal", "true");
  await dialog.locator('input[name="q"]').fill("creatina");
  await expect(page).toHaveURL(/q=creatina/);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.locator(".catalog-panel-toggle").click();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.locator('input[name="q"]')).toHaveValue("creatina");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".catalog-panel-toggle")).toBeFocused();
  expect(errors).toEqual([]);
});

test("los precios de productos y combos mantienen la leyenda de transferencia completa en móvil", async ({ page }, info) => {
  const catalog = demoCatalog();
  const promotions = [{
    id: "11111111-1111-4111-8111-111111111111", name: "Combo de prueba",
    kind: "bundle", active: true, startsAt: null, endsAt: null,
    components: [
      { variantId: catalog.products[0].variants[0].id, quantity: 1 },
      { variantId: catalog.products[1].variants[0].id, quantity: 1 },
    ], listPrice: 5000000, cashPrice: 4000000,
  }];
  await page.addInitScript(({ catalog, promotions }) => {
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify({ catalog, images: {} }));
    localStorage.setItem("stylo.promotions-preview.v1", JSON.stringify({ revision: 0, promotions }));
  }, { catalog, promotions });
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/vista-previa");
    await expect(page.locator(".combo-card")).toHaveCount(1);
    const labels = page.locator(".editorial-pricing-transfer > span:not(.transfer-saving), .combo-card-prices p > span");
    await expect(labels.first()).toBeVisible();
    for (const label of await labels.all()) {
      expect(await label.evaluate((el) => {
        const text = document.createRange();
        text.selectNodeContents(el);
        const lines = Array.from(text.getClientRects());
        const card = el.closest(".product-card")!.getBoundingClientRect();
        const bounds = el.getBoundingClientRect();
        const amount = el.parentElement!.querySelector("strong, b")!.getBoundingClientRect();
        const separated = bounds.top >= amount.bottom - 1 || bounds.left >= amount.right + 2;
        return lines.length === 1 && bounds.left >= card.left && bounds.right <= card.right + 1 && separated;
      }), `Leyenda completa y separada del importe a ${width}px`).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.locator(".product-grid").screenshot({ path: info.outputPath(`prices-${width}.png`), animations: "disabled" });
  }
});
