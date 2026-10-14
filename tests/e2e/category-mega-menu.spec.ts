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
  await navigation.getByRole("link", { name: "Creatinas" }).hover();
  await expect(panel.getByRole("heading", { name: "Creatinas" })).toBeVisible();
  await panel.getByRole("link", { name: "Ver categoría" }).click();
  await expect(page).toHaveURL(/categoria=creatinas/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creatinas");
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
  await trigger.focus();
  await expect(panel).toHaveAttribute("data-open", "true");
  await trigger.press("ArrowDown");
  await expect(
    panel.getByRole("link", { name: "Ver categoría" }),
  ).toBeFocused();
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
  await navigation.getByRole("link", { name: "Creatinas" }).click();
  await expect(page).toHaveURL(/categoria=creatinas/);
  await expect(panel).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
