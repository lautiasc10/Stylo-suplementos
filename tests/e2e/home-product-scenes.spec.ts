import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

const catalog = demoCatalog();
const images: Record<string, string> = {};
for (const [index, product] of catalog.products.entries()) {
  product.featured = true;
  const imageId = `00000000-0000-4000-8000-00000000080${index}`;
  const path = `${product.id}/${imageId}.webp`;
  product.images = [{ id: imageId, path, variantId: null, alt: product.name, position: 0 }];
  images[path] = `data:image/webp;base64,${readFileSync(`public/media/products-normalized-v1/${index % 2 ? "1e8c474c-0897-4451-97c2-038faf9259b6-ba539b39f4d6" : "1ee5a050-f660-42d0-9771-54535b2a8a37-eff70373188d"}-v1-640.webp`).toString("base64")}`;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((data) => localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)), { catalog, images });
});

test("la identidad de Promociones acompaña tienda, búsqueda, ficha y portada", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/catalogo", "/buscar?q=proteina", "/vista-previa/producto/proteina-de-prueba", "/promociones"]) {
    await page.goto(path);
    await expect(page.locator("body")).toHaveCSS("font-family", /Barlow/);
    await expect(page.locator(".site-header")).toHaveCSS("font-family", /Barlow/);
    const heading = page.locator("main h1").first();
    await expect(heading).toHaveCSS("font-family", /Anton/);
  }
  expect(errors).toEqual([]);
});

test("destacados conserva todos los productos y usa reflejo, zoom y destello", async ({ page, isMobile }, info) => {
  if (!isMobile) await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/vista-previa/portada");
  const section = page.locator("#destacados");
  await expect(section.locator(".product-card")).toHaveCount(4);
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator(".home-section-heading")).toHaveCSS("opacity", "1");
  await expect(section.locator(".reveal-card").first()).toHaveCSS("opacity", "1");
  await section.scrollIntoViewIfNeeded();
  const first = section.locator(".product-card").first();
  await expect(first).toHaveAttribute("data-media-style", "reflection");
  await expect(first.locator(".product-artwork-reflection")).toHaveAttribute("aria-hidden", "true");
  await expect(first.locator(".product-reflection-stage")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(first.locator("h2")).toHaveCSS("font-weight", "400");
  await expect(first.locator(".product-artwork-front")).toBeVisible();
  if (!isMobile) {
    await first.locator(".product-reflection-stage").hover();
    await expect.poll(() => first.locator(".product-artwork").evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
    await expect.poll(() => first.locator(".product-reflection-stage").evaluate((node) => getComputedStyle(node, "::after").animationName)).toBe("product-artwork-shine");
  }
  await section.screenshot({ path: info.outputPath(`featured-${isMobile ? "mobile" : "desktop"}.png`), animations: "disabled" });
  await first.getByRole("button", { name: /Agregar/ }).click();
  await expect(page.getByRole("link", { name: /Abrir carrito, 1 unidad/ })).toBeVisible();
  await first.getByRole("link", { name: "Ver variantes", exact: true }).click();
  await expect(page).toHaveURL(/vista-previa\/producto\/proteina-de-prueba\?variante=/);
});

test("novedades comparte el avance y la onda de Ofertas y mantiene una fila nativa accesible", async ({ page, isMobile }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa/portada");
  const section = page.locator("#novedades .scroll-product-rail");
  await expect(section.locator(".arrival-card")).toHaveCount(4);
  await expect(section.locator(".product-artwork-reflection")).toHaveCount(4);
  if (!isMobile) {
    await expect(section).toHaveAttribute("data-scroll-enhanced", "true");
    const positions: string[] = [];
    for (const progress of [.15, .45]) {
      await section.evaluate((node, value) => {
        scrollTo({ top: scrollY + node.getBoundingClientRect().top + (node.clientHeight - innerHeight) * value, behavior: "instant" });
      }, progress);
      await expect.poll(() => section.evaluate((node) => Number(node.style.getPropertyValue("--showcase-progress")))).toBeCloseTo(progress, 1);
      positions.push(await section.locator(".arrival-card").first().evaluate((node) => node.style.transform));
    }
    expect(positions[0]).not.toBe(positions[1]);
    await page.screenshot({ path: info.outputPath("arrivals-scroll-desktop.png"), animations: "disabled" });
    await section.locator(".scroll-product-rail-viewport").focus();
    await page.keyboard.press("Tab");
    await expect(section).toHaveAttribute("data-scroll-enhanced", "false");
  } else {
    await expect(section).toHaveAttribute("data-scroll-enhanced", "false");
    await section.scrollIntoViewIfNeeded();
    const view = section.locator(".scroll-product-rail-viewport");
    await view.evaluate((node) => node.scrollTo({ left: 320, behavior: "instant" }));
    expect(await view.evaluate((node) => node.scrollLeft)).toBeGreaterThan(100);
    await page.screenshot({ path: info.outputPath("arrivals-mobile.png"), animations: "disabled" });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section).toHaveAttribute("data-scroll-enhanced", "false");
  await expect(section.locator(".scroll-product-rail-track")).toHaveCSS("transform", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
