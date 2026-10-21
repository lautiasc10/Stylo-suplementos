import { expect, test, type Page } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

async function textSize(page: Page, size: string) {
  await page.evaluate(
    (size) => (document.documentElement.style.fontSize = size),
    size,
  );
  await page.evaluate(() => document.fonts.ready);
}

async function barSpace(page: Page) {
  return page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>(".purchase-action")!;
    return {
      height: bar.getBoundingClientRect().height,
      padding: parseFloat(getComputedStyle(document.body).paddingBottom),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

test("la compra ampliada reserva su altura real, también al agotar el stock del carrito", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const catalog = demoCatalog();
  catalog.products[0].variants[0].stock = 1;
  await page.addInitScript(
    (catalog) =>
      localStorage.setItem(
        "stylo.catalog-preview.v1",
        JSON.stringify({ catalog, images: {} }),
      ),
    catalog,
  );
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await expect(page.locator(".product-detail")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await textSize(page, "200%");
  const paymentLabels = await page
    .locator(".offer-payment label > span")
    .evaluateAll((labels) =>
      labels.map((label) => ({
        right: label.getBoundingClientRect().right,
        parentRight: label.parentElement!.getBoundingClientRect().right,
        clipped: label.scrollWidth > label.clientWidth + 1,
      })),
    );
  expect(
    paymentLabels.every(
      (label) => label.right <= label.parentRight && !label.clipped,
    ),
  ).toBe(true);
  await expect
    .poll(async () => {
      const value = await barSpace(page);
      return value.padding >= value.height;
    })
    .toBe(true);
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Todo el stock está en tu carrito",
      exact: true,
    }),
  ).toBeDisabled();
  await expect
    .poll(async () => {
      const value = await barSpace(page);
      return value.padding >= value.height;
    })
    .toBe(true);
  await expect.poll(async () => (await barSpace(page)).overflow).toBe(false);
  await page.evaluate(() =>
    scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  const footer = await page.locator(".footer-location").boundingBox();
  const bar = await page.locator(".purchase-action").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(bar!.y);
});

test("pie y navegación no desbordan con texto ampliado, y la reserva se limpia al navegar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await page.locator(".purchase-action").waitFor();
  await textSize(page, "200%");
  const footer = page.getByRole("navigation", { name: "Navegación del pie" });
  for (const link of await footer.getByRole("link").all()) {
    const rect = await link.boundingBox();
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
  }
  await footer.getByRole("link", { name: "Sobre STYLO" }).click();
  await expect(page).toHaveURL(/\/nosotros$/);
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--purchase-bar-height"),
    ),
  ).toBe("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("sin JavaScript la compra participa del flujo y no cubre información al ampliar texto", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 320, height: 844 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto(
      "/vista-previa/imagenes/producto/star-nutrition-proteina-whey-protein-x-2-lbs-dp",
    );
    await textSize(page, "200%");
    await expect(page.locator(".purchase-action")).toHaveCSS(
      "position",
      "static",
    );
    await expect(page.locator(".purchase-price-summary")).toBeHidden();
    await expect(
      page.locator('.purchase-action button[type="submit"]'),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

test("inicio, tienda y resultados mantienen los títulos y precios dentro de pantalla con texto ampliado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [
    "/",
    "/vista-previa",
    "/vista-previa/buscar?q=proteina",
  ]) {
    await page.goto(path);
    if (path !== "/") await page.locator(".product-card").first().waitFor();
    await textSize(page, "200%");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const prices = await page
      .locator(".product-card .editorial-pricing-list strong")
      .evaluateAll((prices) =>
        prices.map((price) => ({
          right: price.getBoundingClientRect().right,
          cardRight: price.closest(".product-card")!.getBoundingClientRect()
            .right,
        })),
      );
    expect(prices.every((price) => price.right <= price.cardRight)).toBe(true);
  }
});

test("en una pantalla baja la compra queda en el flujo y recupera su reserva al volver a vertical", async ({
  page,
}) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await page.locator(".purchase-action").waitFor();
  await textSize(page, "200%");
  await expect(page.locator(".purchase-action")).toHaveCSS(
    "position",
    "static",
  );
  await expect(page.locator(".purchase-price-summary")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".purchase-action")).toHaveCSS("position", "fixed");
  await expect
    .poll(async () => {
      const value = await barSpace(page);
      return value.padding >= value.height;
    })
    .toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue(
          "--purchase-bar-height",
        ),
      ),
    )
    .toBe("");
});
