import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

async function seed(page: Page, brokenPhoto = false) {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  product.slug = "ganador-de-prueba";
  product.name = "Ganador de prueba";
  // The experience must also work when mass gainers is not the first category.
  product.categoryIds.push(
    catalog.categories.find(
      (category) => category.slug === "ganadores-de-masa",
    )!.id,
  );
  product.variants = [
    "Cookies & cream",
    "Frutilla",
    "Vainilla",
    "Banana",
    "Sin sabor",
  ].map((flavor, index) => ({
    ...product.variants[0],
    id: `00000000-0000-4000-8000-00000000015${index}`,
    sku: `GAINER-TEST-${index}`,
    flavor,
    size: "1530 g",
    listPrice: 12000000 + index * 100000,
    cashPrice: 11000000 + index * 100000,
    stock: index === 1 ? 0 : 8,
  }));
  product.images = product.variants.slice(0, 4).map((variant, index) => ({
    id: `00000000-0000-4000-8000-00000000010${index}`,
    path: `${product.id}/00000000-0000-4000-8000-00000000020${index}.webp`,
    variantId: variant.id,
    position: index,
    alt: `Envase ${variant.flavor}`,
  }));
  const photo = readFileSync("public/branding/logo-principal.webp").toString(
    "base64",
  );
  const data = {
    catalog,
    images: Object.fromEntries(
      product.images.map((image, index) => [
        image.path,
        brokenPhoto && index === 1
          ? "data:image/png;base64,AA=="
          : `data:image/webp;base64,${photo}`,
      ]),
    ),
  };
  await page.addInitScript(
    (data) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)),
    data,
  );
  return product;
}

test("la ficha compartida une color de sabor e información de ganadores sin anillo", async ({
  page,
}) => {
  const product = await seed(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  const scene = page.locator(".unified-product-detail");
  await expect(scene).toHaveAttribute("data-flavor", "cookies");
  await expect(scene).toHaveCSS("background-color", "rgb(226, 208, 184)");
  await expect(
    scene.locator("canvas, .variant-ring, .gainer-ingredients"),
  ).toHaveCount(0);
  await expect(scene.locator(".product-image-stage")).toHaveCSS(
    "background-image",
    "none",
  );
  await expect(scene.locator(".product-detail-copy")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(scene.locator(".editorial-pricing-transfer")).toContainText(
    "110.000",
  );
  await expect(scene.locator(".editorial-pricing-list")).toContainText(
    "120.000",
  );
  await expect(scene.locator(".transfer-saving")).toContainText("10.000");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-variant", product.variants[1].id);
  await expect(scene).toHaveAttribute("data-flavor", "frutilla");
  const unavailable = scene.locator('.variant-chip[data-unavailable="true"]');
  await expect(unavailable).toHaveAttribute("aria-current", "true");
  await expect(unavailable.locator(".gainer-flavor-name")).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await expect(scene).toHaveCSS("background-color", "rgb(243, 165, 178)");
  await expect(
    scene.locator(".flavor-scene-layer:not([data-outgoing])"),
  ).toHaveAttribute("data-flavor", "frutilla");
  await expect(scene.locator(".editorial-pricing-transfer")).toContainText(
    "111.000",
  );
  await expect(
    scene.locator('.add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[1].id);
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await scene.getByRole("link", { name: /Vainilla/ }).click();
  await expect(scene).toHaveAttribute("data-flavor", "vainilla");
  await expect(unavailable.locator(".gainer-flavor-name")).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await unavailable.click();
  await expect(unavailable).toHaveAttribute("aria-current", "true");
  await expect(unavailable.locator(".gainer-flavor-name")).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
});

test("chips, flechas, URL y carrito comparten la misma selección y recarga", async ({
  page,
}) => {
  const product = await seed(page);
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  const scene = page.locator(".unified-product-detail");
  await scene.getByRole("link", { name: /Vainilla/ }).click();
  await expect(scene).toHaveAttribute("data-flavor", "vainilla");
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[2].id}`),
  );
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".cart-variant")).toContainText(
    "Vainilla",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(scene).toHaveAttribute("data-variant", product.variants[2].id);
  await scene.getByRole("link", { name: /Sin sabor/ }).click();
  await expect(scene).not.toHaveClass(/flavor-product-detail/);
  await expect(scene.locator(".flavor-scene-decorations")).toHaveCount(0);
  await expect(scene.locator(".product-no-photo")).toBeVisible();
  await expect(scene.locator(".editorial-pricing-transfer")).toContainText(
    "114.000",
  );
});

test("movimiento reducido elimina los giros y permite comprar", async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  await page
    .locator(".gainer-flavor-options")
    .getByRole("link", { name: /Banana/ })
    .click();
  const decor = page.locator(".flavor-scene-decorations");
  await expect(decor).not.toHaveAttribute("data-motion", "true");
  await expect(decor.locator("img").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".variant-spinner")).toHaveAttribute(
    "data-spinner-phase",
    "idle",
  );
  await expect(page.getByRole("button", { name: /Pausar/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Agregar al carrito", exact: true }),
  ).toBeEnabled();
});

test("una foto fallida informa el error y mantiene la nueva selección de compra", async ({
  page,
}) => {
  const product = await seed(page, true);
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator(".gallery-message")).toContainText(
    "No pudimos cargar esta imagen",
  );
  await expect(page.locator(".unified-product-detail")).toHaveAttribute(
    "data-variant",
    product.variants[1].id,
  );
  await expect(
    page.locator('#contenido .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[1].id);
  await expect(page.locator(".editorial-pricing-transfer")).toContainText(
    "111.000",
  );
  await page
    .locator(".gainer-flavor-options")
    .getByRole("link", { name: /Vainilla/ })
    .click();
  await expect(page.locator(".unified-product-detail")).toHaveAttribute(
    "data-flavor",
    "vainilla",
  );
});

test("el último clic prevalece y las decoraciones lentas no bloquean la selección", async ({
  page,
}) => {
  const product = await seed(page);
  await page.route(/\/sabores\/(?:mobile\/)?frutilla-.*\.webp/, (route) =>
    route.abort(),
  );
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  await page.locator(".gainer-flavor-options").evaluate((root) => {
    const links = root.querySelectorAll<HTMLAnchorElement>("a");
    for (let i = 0; i < 10; i++) links[1 + (i % 3)].click();
    links[2].click();
  });
  await expect(page.locator(".unified-product-detail")).toHaveAttribute(
    "data-variant",
    product.variants[2].id,
  );
  await expect(
    page.locator('#contenido .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[2].id);
  await expect(page.locator(".variant-spinner")).toHaveAttribute(
    "data-spinner-phase",
    "idle",
  );
  expect(await page.locator(".flavor-scene-layer").count()).toBeLessThanOrEqual(
    2,
  );
});
