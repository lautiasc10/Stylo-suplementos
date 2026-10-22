import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("agregar desde el mega menú conserva variante, aislamiento y regreso del foco", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  const catalog = demoCatalog(),
    product = catalog.products[0];
  await page.addInitScript(
    (catalog) =>
      localStorage.setItem(
        "stylo.catalog-preview.v1",
        JSON.stringify({ catalog, images: {} }),
      ),
    catalog,
  );
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"])
      writes.push(request.url());
  });
  await page.goto("/vista-previa");
  const trigger = page
    .locator(".category-navigation")
    .getByRole("link", { name: "Proteínas", exact: true });
  await trigger.hover();
  const panel = page.locator(".category-mega-menu");
  const card = panel.locator(".mega-product").first();
  await expect(card.locator("h3")).toHaveText(product.name);
  await expect(card.locator(".mega-product-link")).toHaveAttribute(
    "href",
    `/vista-previa/producto/${product.slug}?variante=${product.variants[0].id}`,
  );
  const add = card.getByRole("button", { name: /Agregar/ });
  await add.click();
  const cart = page.getByRole("dialog");
  await expect(cart).not.toBeVisible();
  await expect(page.locator(".cart-count")).toHaveText("1");
  await expect(add).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.locator(".cart-trigger").click();
  await expect(cart).toBeVisible();
  await expect(cart).toContainText(product.name);
  await expect(cart).toContainText("Chocolate");
  await page.keyboard.press("Escape");
  await expect(cart).not.toBeVisible();
  await expect(page.locator(".cart-trigger")).toBeFocused();
  expect(writes).toEqual([]);
});

test("el hover breve no abre el panel y la salida tiene tolerancia", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/catalogo");
  const trigger = page.locator(".category-navigation a").first();
  const panel = page.locator(".category-mega-menu");
  await trigger.hover();
  await page.mouse.move(5, 300);
  await page.waitForTimeout(220);
  await expect(panel).toHaveAttribute("data-open", "false");
  await trigger.hover();
  await expect(panel).toHaveAttribute("data-open", "true");
  await page.mouse.move(5, 700);
  // A brief excursion should not close an open menu.
  await expect(panel).toHaveAttribute("data-open", "true");
  await expect(panel).toHaveAttribute("data-open", "false");
});

test("el panel de categorías sigue al hover y conserva enlaces reales", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/catalogo");
  const navigation = page.getByRole("navigation", {
    name: "Explorar por categoría",
  });
  const panel = page.locator(".category-mega-menu");
  await navigation.getByRole("link", { name: "Proteínas" }).hover();
  await expect(panel).toHaveAttribute("data-open", "true");
  await expect(panel.getByRole("heading", { name: "Proteínas" })).toBeVisible();
  await expect(panel.locator(".category-dust canvas")).toBeVisible();
  await navigation.getByRole("link", { name: "Creatinas" }).hover();
  await expect(panel.getByRole("heading", { name: "Creatinas" })).toBeVisible();
  await panel.getByRole("link", { name: "Ver categoría" }).click();
  await expect(page).toHaveURL(/categoria=creatinas/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tienda");
  await expect(page.locator('input[name="categoria"][value="creatinas"]')).toBeChecked();
  await expect(panel.locator(".category-dust canvas")).toHaveCount(0);
});

test("el panel se puede recorrer y cerrar con teclado", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/catalogo");
  const navigation = page.getByRole("navigation", {
    name: "Explorar por categoría",
  });
  const trigger = navigation.getByRole("link", { name: "Proteínas" });
  const panel = page.locator(".category-mega-menu");
  // The contextual category bar is available in the store, outside the home.
  await page.keyboard.press("Tab");
  await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
  await trigger.focus();
  await expect(panel).toHaveAttribute("data-open", "true");
  await trigger.press("ArrowDown");
  await expect(
    panel.getByRole("link", { name: "Ver categoría" }),
  ).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(panel.locator(".category-dust canvas")).toHaveCount(0);
  await expect(
    panel.getByRole("link", { name: "Ver categoría" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveAttribute("data-open", "false");
  await expect(trigger).toBeFocused();
  await trigger.press("ArrowDown");
  await expect(
    panel.getByRole("link", { name: "Ver categoría" }),
  ).toBeFocused();
});

test("en móvil las categorías navegan directamente sin panel", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/");
  const navigation = page.getByRole("navigation", {
    name: "Navegación móvil",
  });
  await expect(page.locator(".category-navigation-shell")).toBeHidden();
  await page.locator(".mobile-menu summary").click();
  const panel = page.locator(".category-mega-menu");
  await expect(panel).toBeHidden();
  await expect(panel.locator("canvas")).toHaveCount(0);
  await navigation.getByRole("link", { name: "Creatinas" }).click();
  await expect(page).toHaveURL(/categoria=creatinas/);
  await expect(panel).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("el menú comparte partículas en catálogo y otras páginas sin descargar videos", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  const videos: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes(".mp4")) videos.push(request.url());
  });
  for (const route of ["/catalogo", "/nosotros", "/contacto"]) {
    await page.goto(route);
    const trigger = page
      .getByRole("navigation", { name: "Explorar por categoría" })
      .getByRole("link", { name: "Proteínas" });
    await trigger.hover();
    const panel = page.locator(".category-mega-menu");
    await expect(panel.locator(".category-dust canvas")).toBeVisible();
    const image = () =>
      panel
        .locator("canvas")
        .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
    const before = await image();
    await expect.poll(image).not.toBe(before);
    await expect(
      panel.getByRole("button", { name: /partículas de categorías/ }),
    ).toHaveCount(0);
    if (route === "/catalogo") {
      // The decorative entrance settles without an extra control.
      await page.waitForTimeout(4500);
      const settled = await image();
      await page.waitForTimeout(200);
      expect(await image()).toBe(settled);
    }
    await page.keyboard.press("Escape");
    await expect(panel).toHaveAttribute("data-open", "false");
    await expect(panel.locator("canvas")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  expect(videos).toEqual([]);
});
