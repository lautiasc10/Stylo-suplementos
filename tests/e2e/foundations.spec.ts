import { test, expect, type Page } from "@playwright/test";

async function categoryNavigation(page: Page, mobile: boolean) {
  if (mobile) await page.locator(".mobile-menu summary").click();
  return page.getByRole("navigation", {
    name: mobile ? "Navegación móvil" : "Explorar por categoría",
  });
}

test("inicio, orden de colecciones y navegación sin desbordamiento", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Potenciá tu mejor versión.",
  );
  await expect(page.locator(".home-collection h2")).toHaveText([
    "Productos destacados",
    "Novedades",
    "Promociones",
  ]);
  await expect(page.locator(".home-product-grid .product-card")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (info.project.name === "mobile")
    await page.locator(".mobile-menu summary").click();
  await page
    .getByRole("navigation", {
      name:
        info.project.name === "mobile"
          ? "Navegación móvil"
          : "Navegación principal",
    })
    .getByRole("link", { name: "Tienda", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tienda",
  );
  await expect(page.locator(".catalog-campaign")).toHaveCount(0);
  expect((await page.locator(".catalog-layout").boundingBox())!.y).toBeLessThan(250);
  expect(errors).toEqual([]);
});

test("categorías conservan su selección sin simular productos", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const nav = await categoryNavigation(page, info.project.name === "mobile");
  await nav.getByRole("link", { name: "Creatinas", exact: true }).click();
  await expect(page).toHaveURL(/categoria=creatinas/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creatinas");
  await expect(
    page.locator('input[name="categoria"][value="creatinas"]'),
  ).toBeChecked();
  await expect(
    page.getByRole("link", { name: "Quitar filtro Creatinas", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(0);
});

test("admin y MFA no habilitan acceso sin configuración", async ({
  page,
  request,
}) => {
  for (const path of [
    "/admin",
    "/admin/mfa",
    "/admin/catalogo",
    "/admin/pedidos",
    "/admin/promociones",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(
      page.getByRole("button", { name: "Ingresar", exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole("status")).toContainText("no está habilitado");
  }
  const response = await request.get("/admin/login");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});

test("teclado, menú y movimiento reducido", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Saltar al contenido" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  if (info.project.name === "mobile") {
    const toggle = page.locator(".mobile-menu summary");
    await toggle.click();
    await expect(page.locator(".mobile-menu")).toHaveAttribute("open");
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(page.locator(".mobile-menu")).not.toHaveAttribute("open");
  }
});

test("la lupa busca productos y Escape devuelve el foco", async ({ page }) => {
  await page.goto("/catalogo");
  const toggle = page.getByRole("link", {
    name: "Buscar productos",
    exact: true,
  });
  await toggle.click();
  const input = page.getByRole("combobox", {
    name: "Buscar productos",
    exact: true,
  });
  await expect(input).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(input).toBeHidden();
  await toggle.click();
  await input.fill("creatina");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/buscar\?q=creatina$/);
  await expect(page.locator(".search-dialog")).not.toHaveAttribute("open");
});

test("página inexistente devuelve 404 y permite volver", async ({ page }) => {
  const response = await page.goto("/pagina-inexistente");
  expect(response?.status()).toBe(404);
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL("/");
});

test("búsqueda y categorías siguen disponibles sin JavaScript", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: info.project.use.viewport,
  });
  try {
    const page = await context.newPage();
    await page.goto(`${info.project.use.baseURL}/`);
    await expect(page.locator(".hero-title")).toBeVisible();
    await page
      .getByRole("link", { name: "Buscar productos", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Buscar productos" })
      .fill("proteina");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/q=proteina/);
    const nav = await categoryNavigation(page, info.project.name === "mobile");
    await nav.getByRole("link", { name: "Creatinas", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Creatinas",
    );
  } finally {
    await context.close();
  }
});
