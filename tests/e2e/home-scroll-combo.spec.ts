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
      scrollTo({ top: node.getBoundingClientRect().top + scrollY + node.offsetHeight - innerHeight + 2, behavior: "instant" });
    });
    await expect(section.locator(".scroll-sellers-podium-overlay")).toHaveAttribute("aria-hidden", "false");
    await expect(section.locator(".scroll-sellers-top h2")).toBeVisible();
    await expect(section.locator(".scroll-sellers-podium-overlay h2")).toHaveCount(0);
    await expect(section.locator(".scroll-sellers-podium-overlay .scroll-sellers-podium-card")).toHaveCount(3);
    for (const link of await section.locator(".scroll-sellers-podium-overlay .scroll-sellers-podium-link").all()) {
      const brand = await link.locator(".scroll-sellers-podium-brand").innerText();
      await expect(link).toHaveAccessibleName(new RegExp(brand, "i"));
    }
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

test("el tercer envase sale una sola vez hacia el podio sin volver a aparecer", async ({ page, isMobile }) => {
  test.skip(isMobile, "En móvil se mantiene la composición en el flujo normal");
  await seed(page);
  await page.goto("/vista-previa/portada");
  const section = page.locator("#mas-vendidos");
  await expect(section).toHaveAttribute("data-scroll-enhanced", "true");
  const samples = await page.evaluate(async () => {
    const node = document.getElementById("mas-vendidos")!;
    const top = node.getBoundingClientRect().top + scrollY;
    const distance = node.offsetHeight - innerHeight;
    const samples: { opacity: number; local: number; product: string }[] = [];
    for (let progress = .66; progress <= 1.005; progress += .005) {
      scrollTo({ top: top + Math.min(1, progress) * distance, behavior: "instant" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const style = getComputedStyle(node);
      samples.push({
        opacity: Number(getComputedStyle(node.querySelector(".scroll-sellers-product > img")!).opacity),
        local: Number(style.getPropertyValue("--seller-progress")),
        product: node.querySelector('.scroll-sellers-index [data-active="true"]')!.textContent!.trim(),
      });
      if (node.dataset.scrollComplete === "true") break;
    }
    return samples.filter((sample) => sample.product === "03" && sample.local >= .82);
  });
  expect(samples.length).toBeGreaterThan(5);
  const increases = samples.slice(1).map((sample, index) => sample.opacity - samples[index].opacity);
  expect(Math.max(...increases), "El envase saliente no puede recuperar opacidad al comenzar el podio").toBeLessThan(.02);
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
test(`al terminar libera el recorrido sin mover el contenido visible y permite volver arriba directamente (${viewport.width}x${viewport.height})`, async ({ page, isMobile }, info) => {
  test.skip(isMobile, "En móvil no se reserva un recorrido de scroll");
  await page.setViewportSize(viewport);
  await seed(page);
  await page.goto("/vista-previa/portada");
  const section = page.locator("#mas-vendidos");
  await expect(section).toHaveAttribute("data-scroll-enhanced", "true");
  const result = await page.evaluate(async () => {
    const node = document.getElementById("mas-vendidos")!;
    const next = node.nextElementSibling!;
    const top = node.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + node.offsetHeight - innerHeight + 80, behavior: "instant" });
    const before = next.getBoundingClientRect().top;
    for (let frame = 0; frame < 10 && node.dataset.scrollComplete !== "true"; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return { before, after: next.getBoundingClientRect().top, height: node.offsetHeight, viewport: innerHeight };
  });
  expect(result.height, "No debe conservar la altura cinematográfica una vez terminada").toBeLessThanOrEqual(result.viewport + 1);
  expect(Math.abs(result.after - result.before), "La siguiente sección debe conservar su posición al liberar espacio").toBeLessThan(2);
  await info.attach("sellers-scroll-metrics", { body: JSON.stringify(result), contentType: "application/json" });
  await expect(section).toHaveAttribute("data-scroll-complete", "true");
  await page.evaluate(() => {
    const node = document.getElementById("mas-vendidos")!;
    scrollTo({ top: node.getBoundingClientRect().top + scrollY + 300, behavior: "instant" });
  });
  const beforeWheel = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -220);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(beforeWheel - 200);
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator(".scroll-sellers-podium-overlay")).toHaveAttribute("aria-hidden", "false");
  await expect(section.locator(".scroll-sellers-product")).toHaveAttribute("inert");
  await page.screenshot({ path: info.outputPath("sellers-completed-scroll.png") });
});
}

test("el último píxel de scroll también completa y libera la sección", async ({ page, isMobile }) => {
  test.skip(isMobile, "En móvil no hay escenario fijado");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  await page.goto("/vista-previa/portada");
  const section = page.locator("#mas-vendidos");
  await expect(section).toHaveAttribute("data-scroll-enhanced", "true");
  const end = await page.evaluate(async () => {
    const node = document.getElementById("mas-vendidos")!;
    const end = Math.ceil(node.getBoundingClientRect().top + scrollY + node.getBoundingClientRect().height - innerHeight);
    scrollTo({ top: end - 1, behavior: "instant" });
    for (let frame = 0; frame < 4; frame++) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return end;
  });
  await expect(section).not.toHaveAttribute("data-scroll-complete", "true");
  await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), end);
  await expect(section).toHaveAttribute("data-scroll-complete", "true");
  expect((await section.boundingBox())!.height).toBe(1000);
});
