import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { readFileSync } from "node:fs";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("categorías abiertas con cantidades, selección múltiple de marcas y orden sincronizados con la URL", async ({
  page,
}) => {
  await page.goto("/vista-previa");
  if (page.viewportSize()!.width < 960)
    await page.locator(".catalog-panel-toggle").click();
  await expect(
    page.locator(
      '.catalog-category-choice:has(input[value=""]) .catalog-category-count',
    ),
  ).toHaveText("4");
  await expect(
    page.locator(
      '.catalog-category-choice:has(input[value="proteinas"]) .catalog-category-count',
    ),
  ).toHaveText("1");
  const first = page.locator('input[name="marca"][value="marca-de-prueba-a"]');
  const second = page.locator('input[name="marca"][value="marca-de-prueba-b"]');
  await first.check();
  await expect(page).toHaveURL(/marca=marca-de-prueba-a/);
  await second.check();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("marca"))
    .toBe("marca-de-prueba-a,marca-de-prueba-b");
  await expect(page.locator(".product-card")).toHaveCount(4);
  await first.uncheck();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("marca"))
    .toBe("marca-de-prueba-b");
  if (page.viewportSize()!.width < 960)
    await page
      .getByRole("button", { name: "Ver productos", exact: true })
      .click();
  await page
    .getByRole("combobox", { name: "Ordenar por" })
    .selectOption("price-desc");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("orden"))
    .toBe("price-desc");
  await expect(page.locator(".product-card h2")).toHaveText([
    "Creatina de prueba",
    "Shaker de prueba",
  ]);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Ordenar por" })).toHaveValue(
    "price-desc",
  );
  await expect(second).toBeChecked();
  await expect(first).not.toBeChecked();
});

test("el + agrega la variante visible sin navegar y respeta el stock y los precios actuales", async ({
  page,
}) => {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  product.variants[1].stock = 2;
  const source = `data:image/webp;base64,${readFileSync("public/branding/logo-principal.webp").toString("base64")}`;
  product.images = product.variants.map((v, i) => ({
    id: `00000000-0000-4000-8000-00000000010${i}`,
    path: `${product.id}/00000000-0000-4000-8000-00000000020${i}.webp`,
    alt: `Frente ${v.flavor}`,
    variantId: v.id,
    position: i,
  }));
  await page.addInitScript(
    (state) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(state)),
    {
      catalog,
      images: Object.fromEntries(product.images.map((i) => [i.path, source])),
    },
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/vista-previa?categoria=proteinas");
  const card = page.locator(".product-card");
  await expect(card.locator(".editorial-pricing-list strong")).toHaveText(
    "$ 45.000",
  );
  await expect(card.locator(".editorial-pricing-transfer strong")).toHaveText(
    "$ 41.000",
  );
  await card
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click({ force: true });
  const add = card.getByRole("button", {
    name: /Agregar Proteína de prueba · Vainilla al carrito/,
  });
  await expect(card.locator(".product-card-action")).toHaveAttribute(
    "href",
    new RegExp(`variante=${product.variants[1].id}`),
  );
  await add.click();
  await expect(page).toHaveURL(/vista-previa\?categoria=proteinas$/);
  await page.locator(".cart-trigger").click();
  const cart = page.getByRole("dialog", { name: /Tu carrito/ });
  await expect(cart).toContainText("Vainilla");
  await expect(cart.locator(".bag-total dd")).toHaveText("$ 43.000");
  await page.keyboard.press("Escape");
  await add.click();
  await page.keyboard.press("Escape");
  await expect(add).toBeDisabled();
  expect(errors).toEqual([]);
});

test("grilla compacta a 1440, 768, 375 y 320px sin desbordamiento ni selector superior de pagos", async ({
  page,
}) => {
  for (const width of [1440, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/vista-previa");
    await expect(page.locator(".product-card")).toHaveCount(4);
    const columns = await page
      .locator(".catalog-store .product-grid")
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      );
    expect(columns).toBe(width === 1440 ? 4 : 2);
    const card = page.locator(".product-card").first();
    expect((await card.boundingBox())!.height).toBeLessThan(
      width === 1440 ? 550 : 700,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".catalog-results .offer-payment")).toHaveCount(
      0,
    );
    await expect(card.locator(".product-card-action")).toBeVisible();
  }
});
