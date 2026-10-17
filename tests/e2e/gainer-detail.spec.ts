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

test("ganadores conserva partículas, ingredientes y precios con piedra independiente", async ({
  page,
}) => {
  const product = await seed(page);
  let navigations = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest()) navigations++;
  });
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  const scene = page.locator(".gainer-product-detail");
  await expect(scene).toBeVisible();
  await expect(scene.locator("canvas")).toHaveCount(1);
  await expect(page.locator(".gainer-ingredients")).toHaveAttribute(
    "data-ingredient",
    "cookies",
  );
  expect(
    await page
      .locator(".product-image-stage")
      .evaluate((e) => getComputedStyle(e).backgroundImage),
  ).toContain("rock-square-v1.webp");
  await expect(page.locator(".gainer-product-copy")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  expect((await scene.boundingBox())!.width).toBe(page.viewportSize()!.width);
  const baseline = navigations;
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-variant", product.variants[1].id);
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Envase Frutilla",
  );
  await expect(page.locator(".gainer-ingredients")).toHaveAttribute(
    "data-ingredient",
    "frutilla",
  );
  await expect(
    page.locator(".crossfade-layer:not([inert]) > .transfer-pricing"),
  ).toContainText("111.000");
  await expect(page.locator(".gainer-stock")).toContainText("Sin stock");
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator('.gainer-product-detail .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[1].id);
  expect(navigations).toBe(baseline);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("etiquetas y flechas comparten selección, carrito y enlace recargable", async ({
  page,
}) => {
  const product = await seed(page);
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  const options = page.locator(".gainer-flavor-options");
  await options.getByRole("link", { name: /Vainilla/ }).click();
  await expect(options.getByRole("link", { name: /Vainilla/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.locator(".product-image-gallery")).toHaveAttribute(
    "data-transition",
    "turn",
  );
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".cart-variant")).toContainText(
    "Vainilla",
  );
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[2].id}`),
  );
  await page.reload();
  await expect(page.locator(".gainer-product-detail")).toHaveAttribute(
    "data-variant",
    product.variants[2].id,
  );
  await options.getByRole("link", { name: /Sin sabor/ }).click();
  await expect(page.locator(".gainer-ingredients")).toHaveAttribute(
    "data-ingredient",
    "none",
  );
  await expect(page.locator(".product-no-photo")).toContainText(
    "Imagen del producto pendiente",
  );
  await page.waitForTimeout(1000);
  await expect(page.locator(".gainer-ingredients img")).toHaveCount(0);
});

test("pausa conjunta y movimiento reducido en vivo conservan la compra", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  const ingredients = page.locator(".gainer-ingredients");
  await page
    .getByRole("button", { name: "Pausar animación del fondo" })
    .click();
  await expect(ingredients).toHaveAttribute("data-moving", "false");
  await expect(ingredients.locator("img").first()).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  await page
    .getByRole("button", { name: "Reanudar animación del fondo" })
    .click();
  await expect(ingredients).toHaveAttribute("data-moving", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(ingredients).toHaveAttribute("data-moving", "false");
  await expect(page.locator(".gainer-product-detail canvas")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator(".gainer-stock")).toContainText("Sin stock");
  await expect(page.locator(".product-image-gallery")).not.toHaveAttribute(
    "data-animated",
    "true",
  );
  await expect(ingredients.locator("img").first()).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("una imagen fallida conserva el sabor, el precio y el SKU anterior", async ({
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
  await expect(page.locator(".gainer-product-detail")).toHaveAttribute(
    "data-variant",
    product.variants[0].id,
  );
  await expect(
    page.locator('.gainer-product-detail .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[0].id);
  await expect(
    page.locator(".crossfade-layer:not([inert]) > .transfer-pricing"),
  ).toContainText("110.000");
  await page
    .locator(".gainer-flavor-options")
    .getByRole("link", { name: /Vainilla/ })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".gainer-product-detail")).toHaveAttribute(
    "data-variant",
    product.variants[2].id,
  );
});

test("los cambios rápidos mantienen dos conjuntos como máximo y terminan en el sabor elegido", async ({
  page,
}) => {
  const product = await seed(page);
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  const ingredients = page.locator(".gainer-ingredients");
  await expect(ingredients).toHaveAttribute("data-moving", "true");
  await expect(ingredients.locator(".gainer-ingredient-2 img")).toHaveCSS(
    "filter",
    /blur\(1.5px\)/,
  );
  await expect(page.locator(".gainer-product-detail")).toHaveCSS(
    "background-color",
    "rgb(10, 10, 10)",
  );
  await page.evaluate(() => {
    const root = document.querySelector(".gainer-ingredients")!;
    const counts = () => root.querySelectorAll(".gainer-ingredient-set").length;
    const sample = { max: counts() };
    Object.assign(window, { ingredientSample: sample });
    new MutationObserver(() => {
      sample.max = Math.max(sample.max, counts());
    }).observe(root, { childList: true });
  });
  const options = page.locator(".gainer-flavor-options");
  for (const flavor of ["Frutilla", "Vainilla", "Banana", "Cookies"]) {
    await options.getByRole("link", { name: new RegExp(flavor) }).click();
    await expect(ingredients).toHaveAttribute(
      "data-ingredient",
      flavor === "Cookies" ? "cookies" : flavor.toLowerCase(),
    );
  }
  await expect(page.locator(".gainer-product-detail")).toHaveAttribute(
    "data-variant",
    product.variants[0].id,
  );
  await expect(ingredients.locator(".gainer-ingredient-set")).toHaveCount(1);
  await expect(
    ingredients.locator(".gainer-ingredient-motion").first(),
  ).toHaveCSS("opacity", "1");
  await expect(
    page.locator('.gainer-product-detail .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[0].id);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { ingredientSample: { max: number } })
          .ingredientSample.max,
    ),
  ).toBeLessThanOrEqual(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("ingredientes lentos o fallidos no bloquean la compra ni revierten una selección nueva", async ({
  page,
}) => {
  const product = await seed(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/sabores/frutilla-*.webp", async (route) => {
    await held;
    await route.abort();
  });
  await page.goto("/vista-previa/producto/ganador-de-prueba");
  const options = page.locator(".gainer-flavor-options");
  try {
    await options.getByRole("link", { name: /Frutilla/ }).click();
    await expect(page.locator(".gainer-product-detail")).toHaveAttribute(
      "data-variant",
      product.variants[1].id,
      { timeout: 1500 },
    );
    await expect(page.locator(".gainer-stock")).toContainText("Sin stock");
    await options.getByRole("link", { name: /Vainilla/ }).click();
    await expect(page.locator(".gainer-product-detail")).toHaveAttribute(
      "data-variant",
      product.variants[2].id,
    );
  } finally {
    release();
  }
  await expect(
    page.locator('.gainer-product-detail .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[2].id);
  await expect(
    page.locator('.gainer-ingredient-set[data-outgoing="false"]'),
  ).toHaveAttribute("data-flavor", "vainilla");
  await expect(
    page.getByRole("button", { name: "Agregar al carrito", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".gallery-message")).toHaveCount(0);
});
