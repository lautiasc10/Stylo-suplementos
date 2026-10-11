import { test, expect } from "@playwright/test";

test("inicio, navegación y categorías sin desbordamiento", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /POTENCIÁ.*TU MEJOR.*VERSIÓN/,
  );
  await expect(page.locator(".category-card")).toHaveCount(9);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page
      .getByRole("navigation", { name: "Navegación móvil" })
      .getByRole("link", { name: "Catálogo" })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Catálogo" })
      .click();
  }
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nuestro catálogo",
  );
  expect(errors).toEqual([]);
});

test("categorías conservan su selección sin simular productos", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".category-card").filter({ hasText: "Creatinas" }).click();
  await expect(page).toHaveURL(/categoria=creatinas/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creatinas");
  await expect(
    page
      .getByRole("navigation", { name: "Categorías", exact: true })
      .getByRole("link", { name: "Creatinas", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("admin y MFA no habilitan acceso sin configuración", async ({
  page,
  request,
}) => {
  for (const path of ["/admin", "/admin/mfa"]) {
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

test("teclado, menú y movimiento reducido", async ({ page }, testInfo) => {
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
  if (testInfo.project.name === "mobile") {
    const toggle = page.getByRole("button", { name: "Abrir menú" });
    await toggle.click();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
});

test("página inexistente devuelve 404 y permite volver", async ({ page }) => {
  const response = await page.goto("/pagina-inexistente");
  expect(response?.status()).toBe(404);
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL("/");
});

test("las apariciones respetan cambios de movimiento reducido", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const group = page.locator(".featured-category-grid");
  await expect(group).toHaveAttribute("data-reveal", "pending");
  await group.scrollIntoViewIfNeeded();
  await expect(group).toHaveAttribute("data-reveal", "visible");
  await expect(group.locator(".category-card").first()).toHaveCSS(
    "opacity",
    "1",
  );
  const word = page.locator(".tagline-word").first();
  await expect(word).toHaveAttribute("data-word-reveal", "pending");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(word).not.toHaveAttribute("data-word-reveal", "pending");
  await expect(word).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(group).toHaveCSS("transform", "none");
});

test("las categorías quedan accesibles al enfocarlas con teclado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const card = page.locator(".featured-category-grid .category-card").first();
  await card.focus();
  await expect(card).toBeFocused();
  await expect(page.locator(".featured-category-grid")).toHaveCSS(
    "opacity",
    "1",
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/categoria=proteinas/);
});

test("sin JavaScript se conserva el contenido y la navegación por categorías", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  try {
    const page = await context.newPage();
    await page.goto(`${testInfo.project.use.baseURL}/`);
    await expect(page.locator(".featured-category-grid")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(page.locator(".tagline-word").first()).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
    await page
      .getByRole("navigation", { name: "Explorar por categoría" })
      .getByRole("link", { name: "Creatinas", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Creatinas",
    );
  } finally {
    await context.close();
  }
});
