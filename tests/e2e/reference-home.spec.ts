import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { readFileSync } from "node:fs";

test("el hero deja de pintar partículas bajo los diálogos y reanuda al cerrarlos", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
      if (this.canvas.closest(".reference-hero")) {
        const counter = window as Window & { __heroDraws?: number };
        counter.__heroDraws = (counter.__heroDraws ?? 0) + 1;
      }
      return clear.call(this, x, y, w, h);
    };
  });
  const draws = () =>
    page.evaluate(() => (window as Window & { __heroDraws?: number }).__heroDraws ?? 0);
  await page.goto("/");
  const hero = page.locator(".reference-hero");
  await expect.poll(draws).toBeGreaterThan(2);

  for (const [trigger, dialog] of [
    [".search-trigger", ".reference-search-dialog"],
    [".cart-trigger", ".reference-bag"],
  ]) {
    await page.locator(trigger).click();
    await expect(page.locator(dialog)).toBeVisible();
    await expect(hero).toHaveAttribute("data-ambient-paused", "true");
    await page.waitForTimeout(80);
    const stoppedAt = await draws();
    await page.waitForTimeout(220);
    expect(await draws()).toBe(stoppedAt);
    await page.keyboard.press("Escape");
    await expect(page.locator(dialog)).not.toBeVisible();
    await expect(hero).toHaveAttribute("data-ambient-paused", "false");
    await expect.poll(draws).toBeGreaterThan(stoppedAt);
  }
});

test("las tres fotos, los objetivos y la navegación de compra usan el catálogo real", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".reference-hero")).toBeVisible();
  await expect(page.locator(".reference-goal-card")).toHaveCount(3);
  for (const width of [1440, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 960) {
      const description = await page
        .locator(".reference-hero-footer > p")
        .boundingBox();
      const actions = await page
        .locator(".reference-hero-footer .hero-actions")
        .boundingBox();
      expect(actions!.y).toBeGreaterThanOrEqual(
        description!.y + description!.height,
      );
    }
  }
  const goals = page.locator(".reference-goal-card");
  await expect(goals.nth(0)).toHaveAttribute(
    "href",
    "/catalogo?objetivo=ganar-musculo",
  );
  await expect(goals.nth(1)).toHaveAttribute(
    "href",
    "/catalogo?objetivo=rendir-mas",
  );
  await expect(goals.nth(2)).toHaveAttribute(
    "href",
    "/catalogo?objetivo=recuperarte",
  );
  await goals.nth(0).click();
  await expect(page).toHaveURL(/objetivo=ganar-musculo/);
  await expect(
    page.getByRole("link", {
      name: "Quitar filtro Ganar músculo",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Ordenar por" })
    .selectOption("price-asc");
  await expect(page).toHaveURL(/objetivo=ganar-musculo/);
  await expect(page).toHaveURL(/orden=price-asc/);
});

test("el destacado se revela al hacer scroll, se detiene al salir y con movimiento reducido muestra todo", async ({
  page,
}, info) => {
  const catalog = demoCatalog(),
    product = catalog.products[0];
  const path = `${product.id}/00000000-0000-4000-8000-000000000901.webp`;
  product.images = [
    {
      id: "00000000-0000-4000-8000-000000000901",
      path,
      alt: "Frente del producto de prueba",
      variantId: product.variants[0].id,
      position: 0,
    },
  ];
  const image = `data:image/webp;base64,${readFileSync("public/branding/logo-principal.webp").toString("base64")}`;
  await page.addInitScript(
    (state) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(state)),
    { catalog, images: { [path]: image } },
  );
  await page.goto("/vista-previa/portada");
  const section = page.locator("#mas-vendidos");
  await expect(section).toHaveCount(1);
  await expect(section).not.toContainText("Proteína por porción");
  if (info.project.name === "desktop") {
    await expect(section).toHaveAttribute("data-scroll-enhanced", "true");
    await section.evaluate((el) =>
      scrollTo({
        top: scrollY + el.getBoundingClientRect().top + ((el as HTMLElement).offsetHeight - innerHeight) * 0.7,
        behavior: "instant",
      }),
    );
    await expect
      .poll(() =>
        section.evaluate((el) =>
          Number(
            (el as HTMLElement).style.getPropertyValue("--seller-progress"),
          ),
        ),
      )
      .toBeGreaterThan(0.4);
    await expect(section.locator(".scroll-sellers-product a")).toHaveCount(1);
  } else {
    await expect(section).not.toHaveAttribute("data-scroll-enhanced", "true");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section).not.toHaveAttribute("data-scroll-enhanced", "true");
  await expect(section.locator(".scroll-sellers-fallback a")).toHaveCount(1);
  await section.locator(".scroll-sellers-fallback a").click();
  await expect(page).toHaveURL(
    new RegExp(
      `/vista-previa/producto/${product.slug}\\?variante=${product.variants[0].id}`,
    ),
  );
  await expect(page.locator(".product-detail h1")).toHaveText(product.name);
});

test("sin JavaScript la portada conserva fotos, texto y enlaces sin una sección vacía de tres pantallas", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: info.project.use.viewport,
    baseURL: info.project.use.baseURL,
  });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".reference-goal-card")).toHaveCount(3);
    await expect(
      page.locator("#mas-vendidos[data-scroll-enhanced]"),
    ).toHaveCount(0);
    await page.locator(".reference-goal-card").nth(1).click();
    await expect(page).toHaveURL(/objetivo=rendir-mas/);
  } finally {
    await context.close();
  }
});
