import { expect, test } from "@playwright/test";

test("Sobre STYLO usa las fotos del equipo y conserva lectura en cuatro anchos", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width > 760 ? 900 : 844 });
    await page.goto("/nosotros");
    await expect(page.getByRole("heading", { level: 1, name: /Una marca.*Tu mejor.*versión/s })).toBeVisible();
    await expect(page.locator(".about-stylo-hero-photo img")).toHaveJSProperty("complete", true);
    await expect(page.locator(".about-stylo-story-photo img")).toHaveJSProperty("complete", true);
    await expect.poll(() => page.locator(".about-stylo img").evaluateAll((images) =>
      images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
    )).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px`).toBe(true);
    if ([1440, 768, 390, 320].includes(width)) {
      for (const selector of [".about-stylo-ideas-intro", ".about-stylo-ideas-grid", ".about-stylo-story-photo", ".about-stylo-story-copy", ".about-stylo-close"]) {
        const block = page.locator(selector);
        await block.scrollIntoViewIfNeeded();
        await expect(block).toHaveCSS("opacity", "1");
      }
      await page.locator(".site-footer").scrollIntoViewIfNeeded();
      await expect(page.locator(".site-footer")).toHaveCSS("opacity", "1");
      await page.screenshot({ path: info.outputPath(`about-stylo-${width}.png`), fullPage: true, animations: "disabled" });
    }
  }
  expect(errors).toEqual([]);
});

test("Atletas reemplaza Contacto en el nav y lleva a la sección del Home", async ({ page, isMobile }) => {
  await page.goto("/nosotros");
  if (isMobile) await page.getByLabel("Menú de navegación").click();
  const nav = page.getByRole("navigation", { name: isMobile ? "Navegación móvil" : "Navegación principal" });
  await expect(nav.getByRole("link", { name: "Contacto" })).toHaveCount(0);
  const athletes = nav.getByRole("link", { name: "Atletas" });
  await expect(athletes).toHaveAttribute("href", "/#atletas");
  await athletes.click();
  await expect(page).toHaveURL(/\/#atletas$/);
  await expect(page.locator("#atletas")).toBeVisible();
});

test("Sobre STYLO conserva el contenido con movimiento reducido y sin JavaScript", async ({ page, browser, baseURL }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/nosotros");
  await page.locator(".about-stylo-story").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Una identidad que se lleva puesta." })).toBeVisible();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  await noJs.goto(`${baseURL}/nosotros`);
  await expect(noJs.getByRole("heading", { level: 1 })).toContainText("Una marca.");
  await expect(noJs.getByRole("link", { name: /Explorar tienda/ })).toBeVisible();
  await context.close();
});
