import { expect, test } from "@playwright/test";

test("el panel de categorías sigue al hover y conserva enlaces reales", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/");
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creatinas");
  await expect(panel.locator(".category-dust canvas")).toHaveCount(0);
});

test("el panel se puede recorrer y cerrar con teclado", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/");
  const navigation = page.getByRole("navigation", {
    name: "Explorar por categoría",
  });
  const trigger = navigation.getByRole("link", { name: "Proteínas" });
  const panel = page.locator(".category-mega-menu");
  // Keyboard users can reveal the header immediately during the home intro.
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
    name: "Explorar por categoría",
  });
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
    await panel
      .getByRole("button", { name: "Pausar partículas de categorías" })
      .click();
    const paused = await image();
    await page.waitForTimeout(150);
    expect(await image()).toBe(paused);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveAttribute("data-open", "false");
    await expect(panel.locator("canvas")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  expect(videos).toEqual([]);
});
