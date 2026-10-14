import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

function fixture() {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  product.slug = "whey-protein";
  product.name = "Whey Protein";
  product.variants = ["Banana", "Frutilla", "Vainilla", "Chocolate"].map(
    (flavor, i) => ({
      ...product.variants[0],
      id: `00000000-0000-4000-8000-00000000015${i}`,
      sku: `FLAVOR-TEST-${i}`,
      flavor,
      listPrice: 4500000 + i * 100000,
      cashPrice: 4100000 + i * 100000,
      stock: i === 1 ? 0 : 8,
    }),
  );
  product.images = [0, 0, 1, 2].map((variant, i) => ({
    id: `00000000-0000-4000-8000-00000000010${i}`,
    path: `${product.id}/00000000-0000-4000-8000-00000000020${i}.webp`,
    variantId: product.variants[variant].id,
    position: i,
    alt: `Foto ${product.variants[variant].flavor} ${i}`,
  }));
  const bytes = readFileSync("public/branding/logo-principal.webp");
  return {
    catalog,
    images: Object.fromEntries(
      product.images.map((image) => [
        image.path,
        `data:image/webp;base64,${bytes.toString("base64")}`,
      ]),
    ),
  };
}

async function seed(page: Page, data = fixture()) {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("stylo.catalog-preview.v1")) {
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
    }
  }, data);
  return data.catalog.products[0];
}

test("las flechas sincronizan fondo, foto, stock, precio y carrito sin navegar", async ({
  page,
}) => {
  const product = await seed(page);
  let navigations = 0;
  page.on("request", (request) => {
    if (
      request.isNavigationRequest() ||
      (request.headers().rsc === "1" &&
        request.headers()["next-router-prefetch"] !== "1" &&
        request.url().includes("/producto/whey-protein"))
    )
      navigations++;
  });
  await page.goto("/vista-previa/producto/whey-protein");
  const scene = page.locator(".flavor-product-detail");
  await expect(scene).toHaveAttribute("data-flavor", "banana");
  await expect(page.getByLabel("Presentación", { exact: true })).toHaveCount(0);
  const baseline = navigations;
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-flavor", "frutilla");
  await expect(page.locator(".flavor-selected strong")).toHaveText("Frutilla");
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Frutilla 2",
  );
  await expect(
    page.locator('.add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[1].id);
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".product-prices")).toContainText("46.000");
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[1].id}`),
  );
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-flavor", "vainilla");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".cart-variant")).toContainText(
    "Vainilla",
  );
  expect(navigations).toBe(baseline);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(scene).toHaveAttribute("data-flavor", "vainilla");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("fotos adicionales conservan el sabor y las flechas recorren variantes sin foto", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  await page
    .getByRole("button", { name: "Ver Foto Banana 1", exact: true })
    .click();
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Banana 1",
  );
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-flavor",
    "banana",
  );
  await page
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(page.locator(".flavor-selected strong")).toHaveText("Chocolate");
  await expect(page.locator(".product-no-photo")).toContainText(
    "Imagen del producto pendiente",
  );
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-flavor",
    "neutral",
  );
  await expect(
    page.locator(".flavor-scene-layer:not([data-outgoing])"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator(".flavor-selected strong")).toHaveText("Banana");
});

test("cambios rápidos conservan solo dos capas y movimiento reducido cancela el giro", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  const next = page.getByRole("button", {
    name: "Sabor siguiente",
    exact: true,
  });
  await next.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.locator(".flavor-selected strong")).toHaveText("Vainilla");
  expect(await page.locator(".flavor-scene-layer").count()).toBeLessThanOrEqual(
    2,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".flavor-scene-layer")).toHaveCount(1);
  await expect(page.locator(".product-frame-pair")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".flavor-product-detail")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".flavor-selected strong")).toHaveText("Frutilla");
  await expect(
    page.getByRole("button", { name: "Sabor anterior", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".flavor-scene-layer")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("una foto fallida conserva el sabor y la variante de compra anteriores", async ({
  page,
}) => {
  const data = fixture();
  const product = data.catalog.products[0];
  data.images[product.images[2].path] = "data:image/webp;base64,broken";
  await seed(page, data);
  await page.goto("/vista-previa/producto/whey-protein");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator(".gallery-message")).toContainText(
    "No pudimos cargar esta imagen",
  );
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-flavor",
    "banana",
  );
  await expect(
    page.locator('.add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[0].id);
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Banana 0",
  );
  await expect(
    page.getByRole("button", { name: "Agregar al carrito", exact: true }),
  ).toBeEnabled();
});

test("la decoración fallida no bloquea el sabor y otros productos conservan el selector", async ({
  page,
}) => {
  await seed(page);
  await page.route("**/sabores/frutilla-decor-v1.webp", (route) =>
    route.abort(),
  );
  await page.goto("/vista-previa/producto/whey-protein");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator(".flavor-selected strong")).toHaveText("Frutilla");
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Frutilla 2",
  );
  await page.goto("/vista-previa/producto/creatina-de-prueba");
  await expect(page.getByLabel("Presentación", { exact: true })).toBeVisible();
  await expect(page.locator(".flavor-scene-decorations")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sabor siguiente", exact: true }),
  ).toHaveCount(0);
});
