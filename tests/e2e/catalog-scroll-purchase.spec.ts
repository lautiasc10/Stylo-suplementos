import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("elegir marca o categoría vuelve al inicio después de scrollear", async ({
  page,
}) => {
  await page.goto("/vista-previa");
  await expect(page.locator(".product-card")).toHaveCount(4);
  const toggle = page.locator(".catalog-panel-toggle");
  for (const [name, value] of [
    ["marca", "marca-de-prueba-a"],
    ["categoria", "proteinas"],
  ]) {
    await page.evaluate(() => scrollTo({ top: 700, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    const mobile = await toggle.isVisible();
    if (mobile) await toggle.click();
    const field = page.locator(
      `.catalog-choice-list:has(input[name="${name}"])`,
    );
    // Native scrolling to reach an option must not be mistaken for the reset.
    if (!mobile)
      await page.evaluate(() => scrollTo({ top: 500, behavior: "instant" }));
    await field.locator(`input[value="${value}"]`).check();
    await expect
      .poll(() => new URL(page.url()).searchParams.get(name))
      .toBe(value);
    if (mobile)
      await page
        .getByRole("button", { name: "Ver productos", exact: true })
        .click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  }
});

for (const width of [375, 768]) {
  test(`compra fija a ${width}px en fichas con varios sabores, un sabor y sin sabor`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "mobile");
    await page.setViewportSize({ width, height: 844 });
    const catalog = demoCatalog();
    const photo = `data:image/webp;base64,${readFileSync("public/branding/logo-principal.webp").toString("base64")}`;
    const images: Record<string, string> = {};
    for (const product of catalog.products.slice(0, 3)) {
      if (product.slug === "pre-entreno-de-prueba")
        product.variants[0].flavor = "Banana";
      product.images = product.variants.map((variant, i) => {
        const path = `${product.id}/${variant.id}.webp`;
        images[path] = photo;
        return {
          id: variant.id,
          path,
          variantId: variant.id,
          position: i,
          alt: "Envase de prueba",
        };
      });
    }
    await page.addInitScript(
      (data) =>
        localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)),
      { catalog, images },
    );
    for (const product of catalog.products.slice(0, 3)) {
      await page.goto(`/vista-previa/producto/${product.slug}`);
      const action = page.locator(".purchase-action");
      const verify = async () => {
        await expect(action).toHaveCSS("position", "fixed");
        await expect(action).toHaveCSS("opacity", "1");
        await expect(action).toHaveCSS("transform", "none");
        const bounds = (await action.boundingBox())!;
        expect(Math.abs(bounds.y + bounds.height - 844)).toBeLessThan(2);
        expect(bounds.x).toBe(0);
        expect(bounds.width).toBe(width);
        await expect(action.locator('button[type="submit"]')).toBeInViewport();
      };
      await verify();
      await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }));
      await verify();
      if (product.variants.length > 1) {
        await page.getByRole("link", { name: /Vainilla/ }).click();
        await expect(action.locator('button[type="submit"]')).toHaveText(
          "Sin stock",
        );
        await verify();
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await verify();
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
  });
}
