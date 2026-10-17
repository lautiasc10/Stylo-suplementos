import { test, expect, type Page } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { readFileSync } from "node:fs";
import registry from "../../src/modules/catalog/normalized-images.json" with { type: "json" };
import trial from "../../src/modules/catalog/normalization-trial.json" with { type: "json" };

async function seed(page: Page) {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  catalog.products = [product];
  product.images = product.variants.map((variant, i) => ({
    id: `00000000-0000-4000-8000-00000000090${i}`,
    path: `${product.id}/00000000-0000-4000-8000-00000000080${i}.webp`,
    variantId: variant.id,
    position: i,
    alt: `Envase ${variant.flavor}`,
  }));
  product.informationImages = [
    {
      id: "00000000-0000-4000-8000-000000000799",
      path: `${product.id}/00000000-0000-4000-8000-000000000798.webp`,
      variantId: null,
      position: 0,
      alt: "Ficha nutricional",
    },
  ];
  const assets = Object.values(registry);
  const images = Object.fromEntries(
    [...product.images, ...product.informationImages].map((image, i) => [
      image.path,
      `data:image/webp;base64,${readFileSync(`public${assets[i]}`).toString("base64")}`,
    ]),
  );
  await page.addInitScript(
    (data) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)),
    { catalog, images },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  return product;
}

test("galería de 560–640 px, columnas próximas y miniaturas oscuras con ficha al final", async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  const stage = page.locator(".product-image-stage");
  const box = (await stage.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(560);
  expect(box.width).toBeLessThanOrEqual(640);
  expect(Math.abs(box.height - box.width)).toBeLessThan(1);
  const info = (await page.locator(".product-detail-copy").boundingBox())!;
  expect(info.x - box.x - box.width).toBeLessThanOrEqual(65);
  await expect(page.locator(".product-detail-copy")).toHaveCSS(
    "position",
    "sticky",
  );
  await expect(page.locator(".product-thumbnail-rail")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  const thumbs = page.locator(".product-thumbnail-viewport a");
  await expect(thumbs.first()).toHaveAccessibleName("Ver Envase Chocolate");
  await expect(thumbs.last()).toHaveAccessibleName("Ver Ficha nutricional");
  await expect(thumbs.first()).toHaveAttribute("aria-current", "true");
});

test("chips accesibles sincronizan precio, stock, foto y URL sin duplicar el estado visible", async ({
  page,
}) => {
  const product = await seed(page);
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  const chip = page
    .locator(".variant-picker")
    .getByRole("link", { name: /Vainilla/ });
  await chip.focus();
  await page.keyboard.press("Enter");
  await expect(chip).toHaveAttribute("aria-current", "true");
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[1].id}`),
  );
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Envase Vainilla",
  );
  await expect(
    page.locator(".product-detail-copy .product-prices"),
  ).toContainText("47.000");
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await expect(chip.locator("small")).toHaveCount(0);
  await expect(page.locator("select[name=variante]")).toHaveCount(0);
  await page
    .locator(".variant-picker")
    .getByRole("link", { name: /Chocolate/ })
    .click();
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".cart-variant")).toContainText(
    "Chocolate",
  );
});

test("375 y 768 px: dos columnas, swipe y acción de compra dentro de la pantalla", async ({
  page,
}) => {
  const product = await seed(page);
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/vista-previa");
    expect(
      await page
        .locator(".product-grid")
        .evaluate(
          (node) =>
            getComputedStyle(node).gridTemplateColumns.split(" ").length,
        ),
    ).toBe(2);
    await expect(page.locator(".product-card")).toHaveCount(1);
    await page.goto("/vista-previa/producto/proteina-de-prueba");
    const action = page.locator(".purchase-action");
    await expect(action).toHaveCSS("position", "fixed");
    for (const scroll of [0, 550, 1500]) {
      await page.evaluate((y) => scrollTo(0, y), scroll);
      const bounds = (await action.boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(901);
    }
    await page.locator(".product-image-stage").scrollIntoViewIfNeeded();
    const stage = page.locator(".product-image-stage");
    await stage.dispatchEvent("pointerdown", {
      pointerType: "touch",
      isPrimary: true,
      clientX: 230,
      clientY: 200,
    });
    await stage.dispatchEvent("pointerup", {
      pointerType: "touch",
      isPrimary: true,
      clientX: 80,
      clientY: 206,
    });
    await expect(page.locator(".variant-picker")).toHaveAttribute(
      "data-selected-variant",
      product.variants[1].id,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".product-thumbnail-viewport")).toHaveCSS(
      "display",
      "flex",
    );
  }
});

test("las variantes del detalle conservan enlaces y compra sin JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 900 },
  });
  const page = await context.newPage();
  const product = trial.catalog.products.find(
    (product) => product.variants.length > 1,
  )!;
  await page.goto(`${baseURL}/vista-previa/imagenes/producto/${product.slug}`);
  const next = product.variants[1];
  await page.locator(`.variant-chip[href="?variante=${next.id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`variante=${next.id}`));
  await expect(page.locator(".variant-picker")).toHaveAttribute(
    "data-selected-variant",
    next.id,
  );
  await expect(page.locator(".product-frame-current")).toBeVisible();
  await expect(page.locator(".purchase-action")).toHaveCSS("position", "fixed");
  await context.close();
});
