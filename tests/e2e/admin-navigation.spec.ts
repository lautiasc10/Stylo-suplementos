import { test, expect } from "@playwright/test";

test("ventas, productos y promociones cambian inmediatamente sin navegación al servidor", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  await expect(
    page.getByRole("button", { name: "Nuevo producto", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
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
  const requests: string[] = [];
  await page.route(
    /\/vista-previa\/(gestion|pedidos|promociones)(\?|$)/,
    async (route) => {
      requests.push(route.request().url());
      await route.abort();
    },
  );
  for (const [name, create, path] of [
    ["Promociones", "Crear promoción", "promociones"],
    ["Ventas y retiros", "Crear venta o retiro", "pedidos"],
    ["Productos", "Nuevo producto", "gestion"],
    ["Ventas y retiros", "Crear venta o retiro", "pedidos"],
    ["Promociones", "Crear promoción", "promociones"],
    ["Productos", "Nuevo producto", "gestion"],
  ]) {
    const link = nav.getByRole("link", { name, exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: create, exact: true }),
    ).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page).toHaveURL(new RegExp(`/vista-previa/${path}`));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Crear promoción", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Crear venta o retiro", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("button", { name: "Crear promoción", exact: true }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  await page.unrouteAll();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Crear promoción", exact: true }),
  ).toBeVisible();
});

test("volver a otra tarea conserva promociones, ventas y el stock actualizado", async ({
  page,
}) => {
  await page.goto("/vista-previa/promociones");
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
  await page
    .getByRole("button", { name: "Crear promoción", exact: true })
    .click();
  await page
    .getByLabel("Nombre de promoción", { exact: true })
    .fill("Oferta de navegación");
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
  await nav
    .getByRole("link", { name: "Ventas y retiros", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Crear venta o retiro", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "Venta presencial en efectivo", exact: true })
    .check();
  await page
    .getByLabel("Nombre del cliente", { exact: true })
    .fill("Venta de navegación");
  await page
    .getByRole("button", { name: "Agregar presentación", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Presentación 1", exact: true }).fill("proteina");
  await page.getByRole("listbox", { name: "Resultados para presentación 1" }).getByRole("option").first().click();
  await page
    .getByRole("checkbox", {
      name: "Confirmo que cobré el efectivo y entregué los productos.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Registrar venta en efectivo", exact: true })
    .click();
  const records = page.getByRole("table", {
    name: "Ventas y retiros registrados",
  });
  await expect(records).toContainText("Venta de navegación");
  await expect(records).toContainText("35.000,00");
  await nav.getByRole("link", { name: "Productos", exact: true }).click();
  const stock = await page.evaluate(() => {
    const source = JSON.parse(
      localStorage.getItem("stylo.catalog-preview.v1")!,
    );
    return source.catalog.products[0].variants[0].stock;
  });
  expect(stock).toBe(7);
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  await expect(page.getByLabel("Stock", { exact: true }).first()).toHaveValue(
    String(stock),
  );
  await nav.getByRole("link", { name: "Promociones", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Editar Oferta de navegación",
      exact: true,
    }),
  ).toBeVisible();
  await nav
    .getByRole("link", { name: "Ventas y retiros", exact: true })
    .click();
  await expect(records.getByRole("row")).toHaveCount(2);
  await expect(records).toContainText("Venta de navegación");
  await page
    .getByRole("button", { name: "Crear venta o retiro", exact: true })
    .click();
  await expect(
    page.getByLabel("Nombre del cliente", { exact: true }),
  ).toHaveValue("");
});

test("el lateral cambia el catálogo sin solicitudes de página y mantiene el historial", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion?origen=prueba");
  await expect(
    page.getByRole("button", { name: "Nuevo producto", exact: true }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", {
    name: "Administración",
    exact: true,
  });
  await expect(
    page.getByRole("navigation", { name: "Gestión del catálogo", exact: true }),
  ).toHaveCount(0);
  if (
    !(await nav
      .locator("details")
      .evaluate((el) => (el as HTMLDetailsElement).open))
  )
    await nav.locator("summary").click();

  // A blocked server must not delay a section that is already loaded.
  const requests: string[] = [];
  await page.route("**/vista-previa/gestion?*", async (route) => {
    if (!new URL(route.request().url()).searchParams.has("seccion")) {
      await route.continue();
      return;
    }
    requests.push(route.request().url());
    await route.abort();
  });
  for (const [section, name] of [
    ["brands", "Marcas"],
    ["categories", "Categorías"],
    ["import", "Carga masiva"],
    ["products", "Productos"],
  ]) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`origen=prueba&seccion=${section}`),
    );
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  await page.goBack();
  await expect(
    nav.getByRole("link", { name: "Carga masiva", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Nueva categoría", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    nav.getByRole("link", { name: "Carga masiva", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(requests).toEqual([]);
  await page.unrouteAll();
  await page.reload();
  await expect(page.getByLabel("Archivo de catálogo")).toBeVisible();
  if (
    !(await nav
      .locator("details")
      .evaluate((el) => (el as HTMLDetailsElement).open))
  )
    await nav.locator("summary").click();
  await expect(
    nav.getByRole("link", { name: "Carga masiva", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("navegar por teclado conserva el editor activo y descarta el borrador al cambiar de sección", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion?seccion=products");
  await page
    .getByRole("button", { name: "Nuevo producto", exact: true })
    .click();
  const name = page.getByLabel("Nombre", { exact: true });
  await name.fill("Borrador sin guardar");
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
  const products = nav.getByRole("link", { name: "Productos", exact: true });
  await products.focus();
  await page.keyboard.press("Enter");
  await expect(name).toHaveValue("Borrador sin guardar");
  const brands = nav.getByRole("link", { name: "Marcas", exact: true });
  await brands.focus();
  await page.keyboard.press("Enter");
  await expect(brands).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Nueva marca", exact: true }),
  ).toBeVisible();
  await products.click();
  await page
    .getByRole("button", { name: "Nuevo producto", exact: true })
    .click();
  await expect(name).toHaveValue("");
  await name.fill("Edición recién abierta");
  await expect(name).toHaveValue("Edición recién abierta");
});

test("los enlaces conservan apertura en otra pestaña, entrada desde otra ruta y navegación sin JavaScript", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  await page.goto("/vista-previa/promociones");
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
  await nav.getByRole("link", { name: "Categorías", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Nueva categoría", exact: true }),
  ).toBeVisible();
  const newPage = context.waitForEvent("page");
  await nav
    .getByRole("link", { name: "Marcas", exact: true })
    .click({ modifiers: ["ControlOrMeta"] });
  const opened = await newPage;
  await expect(opened).toHaveURL(/\/vista-previa\/gestion\?seccion=brands/);
  await expect(
    opened.getByRole("button", { name: "Nueva marca", exact: true }),
  ).toBeVisible();
  await opened.close();
  await expect(page).toHaveURL(/seccion=categories/);

  const noScript = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  try {
    const plain = await noScript.newPage();
    await plain.goto("/vista-previa/gestion");
    await plain
      .getByRole("navigation", { name: "Administración", exact: true })
      .getByRole("link", { name: "Marcas", exact: true })
      .click();
    await expect(plain).toHaveURL(/seccion=brands/);
    await expect(
      plain
        .getByRole("navigation", { name: "Administración", exact: true })
        .getByRole("link", { name: "Marcas", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  } finally {
    await noScript.close();
  }
});
