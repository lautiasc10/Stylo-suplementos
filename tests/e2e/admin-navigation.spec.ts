import { test, expect } from "@playwright/test";

test("lateral y pestañas cambian el catálogo sin solicitudes de página y mantienen el historial", async ({
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
  const tabs = page.getByRole("navigation", {
    name: "Gestión del catálogo",
    exact: true,
  });
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
  for (const [section, name, control] of [
    ["brands", "Marcas", "sidebar"],
    ["categories", "Categorías", "tabs"],
    ["import", "Carga masiva", "sidebar"],
    ["products", "Productos", "tabs"],
  ]) {
    if (control === "sidebar")
      await nav.getByRole("link", { name, exact: true }).click();
    else await tabs.getByRole("button", { name, exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`origen=prueba&seccion=${section}`),
    );
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      tabs.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
  await page.goBack();
  await expect(
    tabs.getByRole("button", { name: "Carga masiva", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Nueva categoría", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    tabs.getByRole("button", { name: "Carga masiva", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(requests).toEqual([]);
  await page.unrouteAll();
  await page.reload();
  await expect(
    tabs.getByRole("button", { name: "Carga masiva", exact: true }),
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
