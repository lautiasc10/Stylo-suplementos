import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import sharp from "sharp";

test("las fotos verticales caben completas en la bolsa y un error de foto conserva su alternativa", async ({
  page,
}) => {
  const catalog = demoCatalog();
  const photo = await sharp({
    create: { width: 48, height: 72, channels: 4, background: "#d4af37" },
  })
    .png()
    .toBuffer();
  const path = `${catalog.products[0].id}/00000000-0000-4000-8000-000000000999.png`;
  catalog.products[0].images = [
    {
      id: "00000000-0000-4000-8000-000000000999",
      path,
      alt: "Foto vertical de prueba",
      variantId: catalog.products[0].variants[0].id,
      position: 0,
    },
  ];
  await page.addInitScript(
    ({ catalog, path, image }) =>
      localStorage.setItem(
        "stylo.catalog-preview.v1",
        JSON.stringify({ catalog, images: { [path]: image } }),
      ),
    {
      catalog,
      path,
      image: `data:image/png;base64,${photo.toString("base64")}`,
    },
  );
  await page.goto("/vista-previa");
  await page.locator(".search-trigger").click();
  const search = page.locator(".reference-search-dialog");
  await search
    .getByRole("combobox", { name: "Buscar productos" })
    .fill("proteina");
  const thumbnail = search.locator(".reference-search-thumbnail");
  await expect(thumbnail).toHaveAttribute("data-loaded", "true");
  await thumbnail
    .locator("img")
    .evaluate((img) => img.dispatchEvent(new Event("error")));
  await expect(thumbnail.locator("img")).toHaveCount(0);
  await expect(thumbnail.locator("svg")).toBeVisible();
  await search
    .getByRole("button", { name: /Agregar Proteína de prueba/ })
    .click();
  await page.keyboard.press("Escape");
  await expect(search).not.toBeVisible();
  await page.locator(".cart-trigger").click();
  const image = page.locator(".bag-photo img");
  await expect(image).toBeVisible();
  const imageBox = await image.boundingBox();
  const frameBox = await page
    .locator(".bag-photo .product-thumbnail")
    .boundingBox();
  expect(imageBox!.height).toBeLessThanOrEqual(frameBox!.height);
  expect(imageBox!.y).toBeGreaterThanOrEqual(frameBox!.y);
  expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(
    frameBox!.y + frameBox!.height,
  );
});

test("agregar confirma sin abrir el panel y la bolsa conserva cantidades, pago y checkout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  const add = page.getByRole("button", {
    name: "Agregar al carrito",
    exact: true,
  });
  await add.click();
  await expect(page.locator(".cart-count")).toHaveText("1");
  const bag = page.getByRole("dialog", { name: "Tu carrito", exact: true });
  await expect(bag).not.toBeVisible();
  await expect(page.locator(".cart-arrival")).toContainText(
    "Agregado a tu bolsa",
  );
  await page.getByRole("link", { name: "Abrir carrito, 1 unidades" }).click();
  await expect(bag).toBeVisible();
  await expect(bag.locator(".bag-line")).toHaveCount(1);
  await expect(bag.locator(".cart-variant")).toHaveText(
    "Chocolate · 1 kg · Envase",
  );
  await expect(bag.locator(".bag-total dd")).toHaveText("$ 41.000");
  await bag
    .getByRole("button", { name: "Aumentar cantidad de Proteína de prueba" })
    .click();
  await expect(bag.getByLabel("Cantidad: 2", { exact: true })).toBeVisible();
  await expect(bag.locator(".bag-total dd")).toHaveText("$ 82.000");
  await bag.getByRole("radio", { name: "Mercado Pago", exact: true }).check();
  await expect(bag.locator(".bag-total dd")).toHaveText("$ 90.000");
  await expect(bag).not.toContainText(/envío gratis|cuotas sin interés/i);
  await page.keyboard.press("Escape");
  await expect(bag).not.toBeVisible();
  await expect(page.locator(".cart-trigger")).toBeFocused();
  await page.reload();
  await page.getByRole("link", { name: "Abrir carrito, 2 unidades" }).click();
  await expect(bag.getByLabel("Cantidad: 2", { exact: true })).toBeVisible();
  await bag.getByRole("radio", { name: "Transferencia", exact: true }).check();
  await bag
    .getByRole("link", { name: "Finalizar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/vista-previa\/checkout$/);
  await expect(
    page.getByRole("radio", { name: "Con transferencia" }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});

test("quitar, deshacer y stock máximo siguen funcionando dentro de la bolsa", async ({
  page,
}) => {
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await page.getByRole("link", { name: "Abrir carrito, 1 unidades" }).click();
  const bag = page.locator(".reference-bag");
  for (let i = 1; i < 8; i++)
    await bag
      .getByRole("button", { name: "Aumentar cantidad de Proteína de prueba" })
      .click();
  await expect(
    bag.getByRole("button", {
      name: "Aumentar cantidad de Proteína de prueba",
    }),
  ).toBeDisabled();
  await expect(bag.getByLabel("Cantidad: 8", { exact: true })).toBeVisible();
  await bag.getByRole("button", { name: "Quitar Proteína de prueba" }).click();
  await expect(bag.getByText("Tu carrito está vacío.")).toBeVisible();
  await bag.getByRole("button", { name: "Deshacer" }).click();
  await expect(bag.getByLabel("Cantidad: 8", { exact: true })).toBeVisible();
  await expect(
    bag.getByRole("button", {
      name: "Aumentar cantidad de Proteína de prueba",
    }),
  ).toBeDisabled();
});

test("el buscador muestra el catálogo al abrir y permite agregar la variante encontrada sin cerrarse", async ({
  page,
}) => {
  await page.goto("/vista-previa");
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  const panel = page.locator(".reference-search-dialog");
  const input = panel.getByRole("combobox", { name: "Buscar productos" });
  await expect(input).toBeFocused();
  await expect(panel.locator(".reference-search-row")).toHaveCount(4);
  await input.fill("protiena");
  await expect(panel.locator(".reference-search-row")).toHaveCount(1);
  await panel
    .getByRole("button", { name: /Agregar Proteína de prueba, Chocolate/ })
    .click();
  await expect(panel).toBeVisible();
  await expect(page.locator(".cart-count")).toHaveText("1");
  await input.fill("vainilla");
  await expect(
    panel.getByRole("button", { name: /Agregar Proteína de prueba, Vainilla/ }),
  ).toBeDisabled();
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /option-0$/);
  await input.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(
      `/vista-previa/producto/proteina-de-prueba\\?variante=${demoCatalog().products[0].variants[1].id}`,
    ),
  );
});

test("el vuelo dorado termina en la bolsa, no se repite con movimiento reducido y nunca aparece si falla el guardado", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "La partícula necesita el destino visible",
  );
  await page.goto("/vista-previa");
  await page.keyboard.press("Control+k");
  const panel = page.locator(".reference-search-dialog");
  await panel
    .getByRole("combobox", { name: "Buscar productos" })
    .fill("creatina");
  await panel
    .getByRole("button", { name: /Agregar Creatina de prueba/ })
    .click();
  await expect(page.locator(".cart-fly-dot")).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator(".cart-fly-dot")
        .evaluate(
          (dot) => dot.getAnimations()[0]?.effect?.getTiming().duration,
        ),
    )
    .toBe(800);
  await expect(page.locator(".cart-fly-dot")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await panel
    .getByRole("button", { name: /Agregar Creatina de prueba/ })
    .click();
  await expect(page.locator(".cart-count")).toHaveText("2");
  await expect(page.locator(".cart-fly-dot")).toHaveCount(0);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "stylo.cart-preview.v1") throw new Error("storage denied");
      return original.call(this, key, value);
    };
  });
  await panel
    .getByRole("button", { name: /Agregar Creatina de prueba/ })
    .click();
  await expect(panel.getByRole("alert")).toContainText("No pudimos guardar");
  await expect(page.locator(".cart-count")).toHaveText("2");
  await expect(page.locator(".cart-fly-dot")).toHaveCount(0);
});

test("buscador y bolsa caben a 320, 375 y 768px y mantienen el checkout visible", async ({
  page,
}) => {
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/vista-previa");
    await page
      .getByRole("link", { name: "Buscar productos", exact: true })
      .click();
    const search = page.locator(".reference-search-dialog");
    const bounds = await search.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      await search.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await search
      .getByRole("button", { name: /Agregar Creatina de prueba/ })
      .click();
    await page.keyboard.press("Escape");
    await page.locator(".cart-trigger").click();
    const bag = page.locator(".reference-bag");
    const checkout = await bag
      .getByRole("link", { name: "Finalizar compra" })
      .boundingBox();
    expect(checkout!.y + checkout!.height).toBeLessThanOrEqual(812);
    expect(await bag.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.keyboard.press("Escape");
  }
});

test("hover mueve el envase y el halo, mantiene fija la roca y respeta movimiento reducido", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/vista-previa/imagenes");
  const card = page.locator(".product-card").first();
  const pack = card.locator(".product-frame-link");
  const rock = card.locator(".product-image-stage");
  const originalRock = await rock.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );
  await card.hover();
  await expect
    .poll(() =>
      pack.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a),
    )
    .toBeGreaterThan(1.04);
  expect(
    await rock.evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toBe(originalRock);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(pack).toHaveCSS("transform", "none");
});
