import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

async function seed(page: Page) {
  const catalog = demoCatalog();
  catalog.products[2].variants[0].stock = 3;
  const image = `data:image/webp;base64,${readFileSync("public/branding/logo-principal.webp").toString("base64")}`;
  const images: Record<string, string> = {};
  for (const [index, product] of catalog.products.entries()) {
    const path = `${product.id}/${product.id}.webp`;
    product.images = [{
      id: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      path,
      alt: `Imagen de prueba de ${product.name}`,
      variantId: product.variants[0].id,
      position: 0,
    }];
    images[path] = image;
  }
  await page.addInitScript((data) => {
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
  }, { catalog, images });
}

test("el escenario de ejemplo avanza por productos con el scroll y conserva los enlaces", async ({ page, isMobile }, testInfo) => {
  await seed(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa/portada");
  const section = page.locator("#mas-vendidos");
  await expect(section).toBeVisible();
  await expect(section).toContainText("SELECCIÓN DE EJEMPLO");
  if (isMobile) {
    await expect(section.locator(".scroll-sellers-fallback a")).toHaveCount(3);
    await section.screenshot({ path: testInfo.outputPath("sellers-mobile.png") });
  } else {
    await expect(section).toHaveAttribute("data-scroll-enhanced", "true");
    for (const [progress, count] of [[0.1, "01"], [0.4, "02"], [0.68, "03"]] as const) {
      await page.evaluate((value) => {
        const node = document.getElementById("mas-vendidos")!;
        const top = node.getBoundingClientRect().top + scrollY;
        scrollTo(0, top + value * (node.offsetHeight - innerHeight));
      }, progress);
      await expect(section.locator('.scroll-sellers-index span[data-active="true"]')).toContainText(count);
    }
    await expect(section.locator(".scroll-sellers-product a")).toHaveAttribute("href", /\/vista-previa\/producto\//);
    await page.evaluate(() => {
      const node = document.getElementById("mas-vendidos")!;
      scrollTo(0, node.getBoundingClientRect().top + scrollY + .94 * (node.offsetHeight - innerHeight));
    });
    await expect(section.locator(".scroll-sellers-podium-overlay")).toHaveAttribute("aria-hidden", "false");
    await expect(section.locator(".scroll-sellers-podium-overlay .scroll-sellers-podium-card")).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath("sellers-desktop.png") });
    await section.locator(".scroll-sellers-podium-overlay .scroll-sellers-podium-link").first().click();
    await expect(page).toHaveURL(/\/vista-previa\/producto\//);
    await page.goBack();
    await expect(page).toHaveURL(/\/vista-previa\/portada/);
    await expect(section).toHaveAttribute("data-scroll-enhanced", "false");
    await expect(section.locator(".scroll-sellers-fallback")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("el preset y la opción a mi gusto agregan el combo completo a la bolsa de prueba", async ({ page }) => {
  await seed(page);
  await page.goto("/vista-previa/portada");
  const combo = page.locator("#tu-combo");
  await combo.getByRole("button", { name: "Ganar músculo" }).click();
  await expect(combo.locator(".custom-combo-summary li")).toHaveCount(2);
  await expect(combo.getByText("Con transferencia")).toBeVisible();
  await combo.getByRole("button", { name: "Agregar combo a la bolsa" }).click();
  await expect(page.getByRole("link", { name: /Abrir carrito, 2 unidades/ })).toBeVisible();
  await page.getByRole("link", { name: /Abrir carrito, 2 unidades/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Proteína de prueba");
  await expect(page.getByRole("dialog")).toContainText("Creatina de prueba");
  await page.getByRole("button", { name: /Cerrar/ }).last().click();
  await combo.getByRole("button", { name: "A mi gusto" }).click();
  await expect(combo.locator(".custom-combo-slots fieldset")).toHaveCount(3);
});

test("con movimiento reducido no fija el escenario y mantiene visibles los productos", async ({ page }) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/portada");
  const section = page.locator("#mas-vendidos");
  await expect(section.locator(".scroll-sellers-fallback a")).toHaveCount(3);
  await expect(section.locator(".scroll-sellers-fallback")).toBeVisible();
});
