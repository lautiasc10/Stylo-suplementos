import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("la foto del carrito corresponde a la variante y un fallo conserva la información", async ({
  page,
}) => {
  const catalog = demoCatalog(),
    product = catalog.products[0],
    variant = product.variants[0];
  const path = `${product.id}/00000000-0000-4000-8000-000000000201.webp`;
  product.images = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      path,
      alt: "Fotografía de la presentación elegida",
      variantId: variant.id,
      position: 0,
    },
  ];
  // Archivo local usado exclusivamente como payload de prueba, nunca como foto comercial.
  const image = `data:image/webp;base64,${readFileSync("public/branding/logo-principal.webp").toString("base64")}`;
  await page.addInitScript(
    ({ catalog, path, image, variantId }) => {
      localStorage.setItem(
        "stylo.catalog-preview.v1",
        JSON.stringify({ catalog, images: { [path]: image } }),
      );
      localStorage.setItem(
        "stylo.cart-preview.v1",
        JSON.stringify([{ variantId, quantity: 2 }]),
      );
    },
    { catalog, path, image, variantId: variant.id },
  );
  await page.goto("/vista-previa/carrito");
  const cart = page.locator(".cart-page");
  await expect(
    cart.getByRole("img", { name: "Fotografía de la presentación elegida" }),
  ).toHaveAttribute("src", image);
  await expect(cart.locator(".cart-line-subtotal")).toContainText("90.000,00");
  await cart.getByRole("radio", { name: "Transferencia", exact: true }).check();
  await expect(cart.locator(".cart-line-subtotal")).toContainText("82.000,00");
  await expect(cart.locator(".cart-total")).toContainText("82.000,00");
  await cart
    .getByRole("img", { name: "Fotografía de la presentación elegida" })
    .evaluate((img) => img.dispatchEvent(new Event("error")));
  await expect(
    cart.getByRole("img", { name: "Sin fotografía disponible" }),
  ).toBeVisible();
  await expect(cart.getByLabel("Cantidad: 2", { exact: true })).toBeVisible();
});

test("un carrito largo conserva el resumen, el foco y el acceso a cada producto", async ({
  page,
}) => {
  const catalog = demoCatalog();
  for (const product of catalog.products)
    for (const variant of product.variants) variant.stock = 8;
  const items = catalog.products.flatMap((product) =>
    product.variants.map((variant) => ({ variantId: variant.id, quantity: 1 })),
  );
  await page.addInitScript(
    ({ catalog, items }) => {
      localStorage.setItem(
        "stylo.catalog-preview.v1",
        JSON.stringify({ catalog, images: {} }),
      );
      localStorage.setItem("stylo.cart-preview.v1", JSON.stringify(items));
    },
    { catalog, items },
  );
  await page.goto("/vista-previa/carrito");
  const opener = page.getByRole("link", {
    name: `Abrir carrito, ${items.length} unidades`,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".cart-line")).toHaveCount(items.length);
  const action = dialog.getByRole("link", { name: "Continuar al checkout" });
  await expect(action).toBeInViewport();
  await dialog
    .locator(".cart-products")
    .evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(dialog.locator(".cart-line").last()).toBeInViewport();
  await expect(action).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await page.setViewportSize({ width: 844, height: 390 });
  await opener.click();
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeInViewport();
  await dialog.locator(".cart-line").first().scrollIntoViewIfNeeded();
  await expect(dialog.locator(".cart-line").first()).toBeInViewport();
});

test("la navegación administrativa abre la tarea elegida y la edición conserva sus secciones", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  const nav = page.getByRole("navigation", {
    name: "Administración",
    exact: true,
  });
  if (
    !(await nav
      .locator("details")
      .evaluate((el) => (el as HTMLDetailsElement).open))
  )
    await nav.locator("summary").click();
  await nav.getByRole("link", { name: "Marcas", exact: true }).click();
  await expect(page).toHaveURL(/seccion=brands/);
  await expect(
    page.getByRole("button", { name: "Nueva marca", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Marcas", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Productos", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Información del producto" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Fotografías", exact: true }).click();
  await expect(page.getByLabel("Subir imágenes")).toBeInViewport();
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Cambios guardados.");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav.locator("summary")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    nav.getByRole("link", { name: "Productos", exact: true }),
  ).toBeVisible();
});

test("quitar una promoción permite cancelar y devuelve el foco al listado", async ({
  page,
}) => {
  await page.goto("/vista-previa/promociones");
  await page
    .getByLabel("Nombre de promoción", { exact: true })
    .fill("Rebaja de prueba");
  await page
    .getByLabel("Precio final de lista (ARS)", { exact: true })
    .fill("40000");
  await page
    .getByLabel("Precio final efectivo / transferencia (ARS)", { exact: true })
    .fill("35000");
  await page
    .getByRole("button", { name: "Guardar promoción", exact: true })
    .click();
  const remove = page.getByLabel("Quitar Rebaja de prueba", { exact: true });
  await remove.click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(remove).toBeFocused();
  await expect(page.locator(".promotion-row")).toHaveCount(1);
  await remove.click();
  await page
    .getByRole("button", { name: "Confirmar eliminación", exact: true })
    .click();
  await expect(page.locator(".promotion-row")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Promociones guardadas", exact: true }),
  ).toBeFocused();
});

test("320 px y tablet no desbordan en carrito, edición, promociones y checkout", async ({
  page,
}) => {
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await page.keyboard.press("Escape");
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/vista-previa/carrito",
      "/vista-previa/checkout",
      "/vista-previa/promociones",
      "/vista-previa/pedidos",
      "/vista-previa/gestion",
    ]) {
      await page.goto(path);
      if (path.endsWith("gestion"))
        await page
          .getByRole("button", { name: "Nuevo producto", exact: true })
          .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
});
