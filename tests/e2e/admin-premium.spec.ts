import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("productos, ventas y promociones comparten la composición premium y editores accesibles", async ({ page, isMobile }, info) => {
  if (!isMobile) await page.setViewportSize({ width: 1440, height: 1000 });
  const catalog = demoCatalog();
  const variant = catalog.products[0].variants[0];
  await page.addInitScript(({ catalog, variant }) => {
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify({ catalog, images: {} }));
    localStorage.setItem("stylo.promotions-preview.v1", JSON.stringify({ revision: 1, promotions: [{ id: "00000000-0000-4000-8000-000000000999", kind: "sale", name: "Oferta de prueba", active: true, components: [{ variantId: variant.id, quantity: 1 }], cashPrice: Math.floor(variant.cashPrice * .9), listPrice: Math.floor(variant.listPrice * .9), startsAt: null, endsAt: null, maxUses: 10, used: 0 }] }));
  }, { catalog, variant });
  await page.goto("/vista-previa/gestion");
  await expect(page.locator(".admin-product-card").first()).toContainText("Efectivo");
  await page.locator(".admin-shell").screenshot({ path: info.outputPath(`products-${isMobile ? "mobile" : "desktop"}.png`) });
  await page.getByRole("button", { name: "Nuevo producto", exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar edición", exact: true }).click();
  await page.goto("/vista-previa/promociones");
  await expect(page.locator(".promotions-table tbody tr")).toHaveCount(1);
  await page.locator(".admin-shell").screenshot({ path: info.outputPath(`promotions-${isMobile ? "mobile" : "desktop"}.png`) });
  const edit = page.getByRole("button", { name: "Editar Oferta de prueba", exact: true });
  await edit.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Rebaja", exact: true })).toBeChecked();
  await page.getByRole("dialog").screenshot({ path: info.outputPath(`promotion-editor-${isMobile ? "mobile" : "desktop"}.png`) });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/vista-previa/pedidos");
  await page.getByRole("button", { name: "Crear venta o retiro", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Pedido pendiente de retiro", exact: true })).toBeChecked();
  await page.getByRole("dialog").screenshot({ path: info.outputPath(`sales-editor-${isMobile ? "mobile" : "desktop"}.png`) });
  await expect(page.getByLabel("Nombre del cliente", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/vista-previa/resumen");
  await page.getByRole("link", { name: "Ver catálogo", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo producto", exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
});

test("el resumen premium conserva navegación y muestra solo métricas reales o indisponibles", async ({ page, isMobile }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa/resumen");
  await expect(page.getByRole("heading", { name: "Resumen de la tienda" })).toBeVisible();
  const summary = page.getByRole("term");
  await expect(summary).toHaveCount(5);
  await expect(summary.nth(0)).toHaveText("Facturación mensual");
  await expect(summary.nth(1)).toHaveText("Ventas del mes");
  await expect(summary.nth(2)).toHaveText("Ganancias");
  await expect(summary.nth(3)).toHaveText("Ticket promedio");
  await expect(summary.nth(4)).toHaveText("Pendientes de retiro");
  await expect(page.getByRole("heading", { name: "Facturación histórica" })).toBeVisible();
  if (isMobile) await page.getByText("Menú de administración").click();
  await expect(page.getByRole("navigation", { name: "Administración" }).getByRole("link", { name: "Resumen" })).toBeVisible();
  await page.screenshot({ path: info.outputPath(`admin-resumen-${isMobile ? "mobile" : "desktop"}.png`), fullPage: true });
  expect(errors).toEqual([]);
});
