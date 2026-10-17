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

test("el menú conserva el color del sabor y excluye las partículas doradas", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  const navigation = page.getByRole("navigation", {
    name: "Explorar por categoría",
  });
  const panel = page.locator(".category-mega-menu");
  for (const flavor of ["banana", "frutilla"]) {
    await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
      "data-flavor",
      flavor,
    );
    await navigation.getByRole("link", { name: "Proteínas" }).hover();
    await expect(panel).toHaveAttribute("data-open", "true");
    await expect(panel.locator("canvas")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            getComputedStyle(document.querySelector(".category-mega-menu")!)
              .backgroundColor ===
            getComputedStyle(document.querySelector(".category-navigation")!)
              .backgroundColor,
        ),
      )
      .toBe(true);
    await page.keyboard.press("Escape");
    if (flavor === "banana")
      await page
        .getByRole("button", { name: "Sabor siguiente", exact: true })
        .click();
  }
});

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
  const bounds = await scene.boundingBox();
  expect(bounds!.width).toBe(page.viewportSize()!.width);
  expect(bounds!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height);
  await expect(page.getByLabel("Presentación", { exact: true })).toHaveCount(0);
  const baseline = navigations;
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-flavor", "frutilla");
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Frutilla");
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Frutilla 2",
  );
  await expect(
    page.locator('.flavor-product-detail .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[1].id);
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator("#contenido .crossfade-layer:not([inert]) .product-prices"),
  ).toContainText("46.000");
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
    .getByRole("link", { name: "Ver Foto Banana 1", exact: true })
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
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Chocolate");
  await expect(page.locator(".product-no-photo")).toContainText(
    "Imagen del producto pendiente",
  );
  await expect(page.locator(".product-no-photo")).toBeVisible();
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
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Banana");
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
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Vainilla");
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
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Frutilla");
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
    page.locator('.flavor-product-detail .add-to-cart input[name="variantId"]'),
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
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Frutilla");
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Frutilla 2",
  );
  await page.goto("/vista-previa/producto/creatina-de-prueba");
  await expect(page.locator(".variant-picker")).toBeVisible();
  await expect(page.locator(".flavor-scene-decorations")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sabor siguiente", exact: true }),
  ).toHaveCount(0);
});

test("el fondo se detiene solo, permite cambiar de sabor y respeta movimiento reducido", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  const decor = page.locator(".flavor-scene-decorations");
  await expect(decor).toHaveAttribute("data-playing", "true");
  await expect(page.getByRole("button", { name: /Pausar fondo/i })).toHaveCount(
    0,
  );
  await expect(decor.locator("img").first()).toHaveCSS(
    "animation-iteration-count",
    "1",
  );
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  const layer = decor.locator('.flavor-scene-layer[data-flavor="frutilla"]');
  await expect(layer).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(layer.locator("img").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".product-detail-copy")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
});

test("las fotos vecinas se preparan antes del clic y se reutilizan al recorrer sabores", async ({
  page,
}) => {
  const data = fixture();
  const paths = data.catalog.products[0].images;
  // Distinct, valid files make the cache check meaningful across real decodes.
  data.images[paths[2].path] =
    `data:image/webp;base64,${readFileSync("public/branding/logo-horizontal.webp").toString("base64")}`;
  data.images[paths[3].path] =
    `data:image/webp;base64,${readFileSync("public/branding/logo-completo.webp").toString("base64")}`;
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    (window as unknown as { decodes: string[] }).decodes = [];
    HTMLImageElement.prototype.decode = function () {
      (window as unknown as { decodes: string[] }).decodes.push(this.src);
      return decode.call(this);
    };
  });
  await seed(page, data);
  await page.goto("/vista-previa/producto/whey-protein");
  const strawberry = data.images[paths[2].path];
  await page.locator(".product-image-gallery-detail").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(
        (src) =>
          (window as unknown as { decodes: string[] }).decodes.filter(
            (value) => value === src,
          ).length,
        strawberry,
      ),
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Frutilla");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Vainilla");
  await page
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(
    page.locator('.variant-chip[aria-current="true"] > span'),
  ).toHaveText("Frutilla");
  expect(
    await page.evaluate(
      (src) =>
        (window as unknown as { decodes: string[] }).decodes.filter(
          (value) => value === src,
        ).length,
      strawberry,
    ),
  ).toBe(1);
});
