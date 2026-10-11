import { test, expect } from "@playwright/test";
test("carrito lateral conserva SKU y cantidades, restaura foco y persiste sin mezclar la tienda", async ({
  page,
}) => {
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  const add = page.getByRole("button", {
    name: "Agregar al carrito",
    exact: true,
  });
  await add.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog).toHaveCSS("animation-name", "none");
  await expect(dialog).toContainText("DEMO-1-A");
  await dialog
    .getByRole("button", { name: "Aumentar cantidad de Proteína de prueba" })
    .click();
  await expect(dialog.getByLabel("Cantidad: 2", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(add).toBeFocused();
  await page.reload();
  await page.getByRole("link", { name: "Abrir carrito, 2 unidades" }).click();
  await expect(dialog.getByLabel("Cantidad: 2", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/carrito");
  await expect(
    page.locator(".cart-page").getByText("Tu próxima elección empieza acá."),
  ).toBeVisible();
});
test("una variante agotada no se agrega y las cantidades no superan la existencia", async ({
  page,
}) => {
  await page.goto(
    "/vista-previa/producto/proteina-de-prueba?variante=00000000-0000-4000-8000-000000000051",
  );
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Presentación", { exact: true })
    .selectOption("00000000-0000-4000-8000-000000000050");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  const dialog = page.getByRole("dialog"),
    increase = dialog.getByRole("button", {
      name: "Aumentar cantidad de Proteína de prueba",
    });
  for (let i = 1; i < 8; i++) await increase.click();
  await expect(increase).toBeDisabled();
  await expect(dialog.getByLabel("Cantidad: 8", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Quitar Proteína de prueba" })
    .click();
  await expect(
    dialog.getByText("Tu próxima elección empieza acá."),
  ).toBeVisible();
});
test("admin configura cantidad con dos precios y checkout revalida sin guardar datos personales", async ({
  page,
}) => {
  await page.goto("/vista-previa/promociones");
  await page
    .getByLabel("Nombre de promoción", { exact: true })
    .fill("Cantidad de prueba");
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("quantity");
  await page
    .getByLabel("Precio final de lista (ARS)", { exact: true })
    .fill("40000");
  await page
    .getByLabel("Precio final efectivo / transferencia (ARS)", { exact: true })
    .fill("35000");
  await page
    .getByRole("button", { name: "Guardar promoción", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Promociones guardadas.");
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Aumentar cantidad de Proteína de prueba" })
    .click();
  await dialog.getByRole("link", { name: "Continuar al checkout" }).click();
  await expect(page.locator(".checkout-total")).toContainText("80.000,00");
  await page
    .getByLabel("Transferencia · precio de efectivo", { exact: true })
    .check();
  await expect(page.locator(".checkout-total")).toContainText("70.000,00");
  await page
    .getByLabel("Nombre y apellido", { exact: true })
    .fill("Cliente ficticio");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("cliente@example.com");
  await page
    .getByLabel("Teléfono / WhatsApp", { exact: true })
    .fill("3415550000");
  await page.getByLabel("DNI", { exact: true }).fill("12345678");
  await page
    .getByRole("button", { name: "Revisar selección", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("No se creó un pedido");
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage })),
  ).not.toContain("cliente@example.com");
  expect(page.url()).not.toContain("12345678");
});
test("gestión permite editar un combo y registra un retiro una vez sin descontar stock", async ({
  page,
}) => {
  await page.goto("/vista-previa/promociones");
  await page
    .getByLabel("Nombre de promoción", { exact: true })
    .fill("Combo de prueba");
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("bundle");
  await page
    .getByRole("button", { name: "Agregar componente", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Agregar componente", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Presentación del combo 2", exact: true })
    .selectOption("00000000-0000-4000-8000-000000000052");
  await page
    .getByLabel("Precio final de lista (ARS)", { exact: true })
    .fill("60000");
  await page
    .getByLabel("Precio final efectivo / transferencia (ARS)", { exact: true })
    .fill("50000");
  await page
    .getByRole("button", { name: "Guardar promoción", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Promociones guardadas.");
  await page
    .getByRole("button", { name: "Editar Combo de prueba", exact: true })
    .click();
  await expect(
    page.getByLabel("Precio final de lista (ARS)", { exact: true }),
  ).toHaveValue("60000.00");
  await page
    .getByLabel("Precio final efectivo / transferencia (ARS)", { exact: true })
    .fill("49000");
  await page
    .getByRole("button", { name: "Guardar promoción", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Promociones guardadas.");
  await page.goto("/vista-previa/pedidos");
  await page
    .getByLabel("Nombre del cliente", { exact: true })
    .fill("Retiro ficticio");
  await page
    .getByRole("button", { name: "Agregar presentación", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Agregar presentación", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Presentación 2", exact: true })
    .selectOption("00000000-0000-4000-8000-000000000052");
  await page
    .getByRole("button", { name: "Registrar retiro pendiente", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar retiro pendiente", exact: true })
    .click();
  await expect(page.locator(".promotion-row")).toHaveCount(1);
  await expect(page.locator(".promotion-row")).toContainText("49.000,00");
  await expect(page.locator(".promotion-row")).toContainText("Pago pendiente");
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Aumentar cantidad de Proteína de prueba" }),
  ).toBeEnabled();
});
test("carrito público sin JavaScript no filtra datos privados ni simula pedidos", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("/carrito");
    await expect(
      page.getByRole("heading", { name: "Tu carrito", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".cart-page").getByText("Tu próxima elección empieza acá."),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Explorar productos", exact: true })
      .click();
    await expect(page).toHaveURL(/\/catalogo$/);
  } finally {
    await context.close();
  }
});
