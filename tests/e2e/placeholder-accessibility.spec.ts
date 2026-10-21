import { expect, test } from "@playwright/test";

test("las imágenes pendientes conservan su etiqueta visible en el nombre del enlace", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa");
  const placeholders = page.locator(
    ".product-card .product-placeholder, .product-card .product-frame-link:has(.product-no-photo)",
  );
  await expect(placeholders).not.toHaveCount(0);
  for (const link of await placeholders.all()) {
    // Decorative SVG artwork may contain category lettering; the action's
    // visible caption is the pending-photo message below that illustration.
    const caption = (
      await link.locator(":scope > span, .product-no-photo").first().innerText()
    ).trim();
    expect(caption).not.toBe("");
    await expect(link).toHaveAccessibleName(new RegExp(caption));
    await expect(link).toHaveAttribute("href", /\/producto\/.+\?variante=/);
  }
});
