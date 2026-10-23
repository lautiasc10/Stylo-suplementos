import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

test.beforeEach(async ({ page }) => {
  const catalog = demoCatalog();
  const variant = catalog.products[0].variants[0];
  const promotions = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Rebaja de prueba",
      kind: "sale",
      active: true,
      components: [{ variantId: variant.id, quantity: 1 }],
      listPrice: 3400000,
      cashPrice: 3000000,
      startsAt: null,
      endsAt: null,
    },
  ];
  await page.addInitScript(
    ({ catalog, promotions }) => {
      if (!localStorage.getItem("stylo.payment-test-seeded")) {
        localStorage.setItem(
          "stylo.catalog-preview.v1",
          JSON.stringify({ catalog, images: {} }),
        );
        localStorage.setItem(
          "stylo.promotions-preview.v1",
          JSON.stringify({ revision: 0, promotions }),
        );
        localStorage.setItem("stylo.payment-test-seeded", "1");
      }
    },
    { catalog, promotions },
  );
});

test("ficha: un precio por medio de pago, sin ahorro ni sabor duplicado; cantidad y carrito sincronizados", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  const pricing = page.locator(".product-payment-prices");
  const summary = page.locator(".purchase-price-summary");
  await expect(summary.locator("strong")).toHaveText("$ 30.000");
  await expect(summary).toContainText("por unidad con transferencia");
  if (test.info().project.name === "mobile") {
    await expect(summary).toBeInViewport();
    expect((await summary.boundingBox())!.y).toBeLessThan(
      (await page.locator(".product-purchase-form").boundingBox())!.y,
    );
  } else {
    await expect(summary).toBeHidden();
  }
  await expect(pricing.locator(".product-price-main > strong")).toHaveText(
    "$ 30.000",
  );
  await expect(pricing.locator("del")).toHaveText("$ 41.000");
  expect(
    await pricing
      .locator("del .animated-amount-visual")
      .evaluate((node) => getComputedStyle(node, "::after").textDecorationLine),
  ).toBe("line-through");
  await expect(pricing.locator(".product-price-label")).toHaveText(
    "Precio por unidad con transferencia",
  );
  await expect(pricing.locator(".product-price-main > strong")).toHaveCount(1);
  await expect(pricing).not.toContainText("Ahorrás");
  await expect(pricing).not.toContainText("Mercado Pago");
  await expect(page.locator(".gainer-flavor-picker > p")).toHaveCount(0);
  await expect(page.locator(".product-offer-applied")).toHaveText(
    "Precio promocional aplicado",
  );
  await page.getByRole("radio", { name: "Mercado Pago", exact: true }).check();
  await expect(pricing.locator(".product-price-main > strong")).toHaveText(
    "$ 34.000",
  );
  await expect(pricing.locator("del")).toHaveText("$ 45.000");
  await expect(summary.locator("strong")).toHaveText("$ 34.000");
  await expect(summary).toContainText("por unidad con Mercado Pago");
  await expect(pricing.locator(".product-price-label")).toHaveText(
    "Precio por unidad con Mercado Pago",
  );
  await page
    .getByRole("button", { name: "Aumentar cantidad", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Aumentar cantidad", exact: true })
    .click();
  await expect(
    page.locator('.product-purchase-form input[name="quantity"]'),
  ).toHaveValue("3");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await page.locator(".cart-trigger").click();
  const dialog = page.getByRole("dialog", { name: /Tu carrito/ });
  await expect(dialog.getByLabel("Cantidad: 3", { exact: true })).toBeVisible();
  await expect(dialog.locator('input[value="mercado-pago"]')).toBeChecked();
  await page.keyboard.press("Escape");
  await page.locator('.variant-chip[data-unavailable="true"]').click();
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator('.product-purchase-form input[name="quantity"]'),
  ).toHaveValue("1");
  await expect(summary.locator("strong")).toHaveText("$ 47.000");
  const information = page.getByRole("region", {
    name: "Información del producto",
    exact: true,
  });
  await information.locator("summary").click();
  await expect(information.locator(".product-description")).toContainText(
    "Datos ficticios",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("la cantidad elegida y el carrito determinan el precio por unidad y respetan el cupo", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/ofertas");
  await page.evaluate(() => {
    const saved = JSON.parse(
      localStorage.getItem("stylo.promotions-preview.v1")!,
    );
    saved.promotions[0] = {
      ...saved.promotions[0],
      kind: "quantity",
      maxUses: 3,
      components: [{ ...saved.promotions[0].components[0], quantity: 2 }],
      listPrice: 4000000,
      cashPrice: 3500000,
    };
    localStorage.setItem("stylo.promotions-preview.v1", JSON.stringify(saved));
  });
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  const price = page.locator(".product-price-main > strong");
  await expect(price).toHaveText("$ 41.000");
  const summary = page.locator(".purchase-price-summary strong");
  await expect(summary).toHaveText("$ 41.000");
  await page
    .getByRole("button", { name: "Aumentar cantidad", exact: true })
    .click();
  await expect(price).toHaveText("$ 35.000");
  await expect(summary).toHaveText("$ 35.000");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await page.locator(".cart-trigger").click();
  await expect(page.getByRole("dialog").locator(".bag-total dd")).toHaveText(
    "$ 70.000",
  );
  await page.keyboard.press("Escape");
  // Two units already in the cart + another two would exceed the three-unit cap.
  await expect(price).toHaveText("$ 41.000");
  await expect(summary).toHaveText("$ 41.000");
  await page
    .getByRole("button", { name: "Disminuir cantidad", exact: true })
    .click();
  await expect(price).toHaveText("$ 35.000");
  await expect(summary).toHaveText("$ 35.000");
});

test("el combo es opcional, tiene un solo total identificado y agrega todos sus componentes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/ofertas");
  await page.evaluate(() => {
    const catalog = JSON.parse(
      localStorage.getItem("stylo.catalog-preview.v1")!,
    );
    catalog.catalog.products[0].name = "Proteína de prueba DP";
    catalog.catalog.products[0].variants[0].presentation = "DP";
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(catalog));
    localStorage.setItem(
      "stylo.promotions-preview.v1",
      JSON.stringify({
        revision: 0,
        promotions: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Proteína y creatina",
            kind: "bundle",
            active: true,
            components: [
              catalog.catalog.products[0].variants[0],
              catalog.catalog.products[1].variants[0],
            ].map((variant) => ({ variantId: variant.id, quantity: 1 })),
            listPrice: 5000000,
            cashPrice: 4000000,
            startsAt: null,
            endsAt: null,
          },
        ],
      }),
    );
  });
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await expect(page.locator("h1")).toHaveText("Proteína de prueba Doypack");
  await expect(page.locator(".gainer-stock")).toContainText("Doypack");
  const price = page.locator(".product-price-main > strong");
  await expect(price).toHaveText("$ 41.000");
  const offer = page.getByRole("link", { name: "Ver combo Proteína y creatina", exact: true });
  await expect(offer).toContainText("Total del combo con transferencia: $ 40.000");
  await offer.click();
  await expect(page).toHaveURL(/\/vista-previa\/combo\//);
  await expect(page.locator(".combo-detail-info li")).toHaveCount(2);
  const total = page.locator(".combo-detail-price .animated-amount-target");
  await expect(total).toHaveText("$ 40.000");
  await page.getByRole("radio", { name: "Mercado Pago", exact: true }).check();
  await expect(total).toHaveText("$ 50.000");
  await page
    .getByRole("button", { name: "Agregar combo completo", exact: true })
    .click();
  await page.locator(".cart-trigger").click();
  const cart = page.getByRole("dialog", { name: /Tu carrito/ });
  await expect(cart).toBeVisible();
  await expect(cart.locator(".bag-total dd")).toHaveText("$ 50.000");
  await expect(cart.getByLabel("Cantidad: 1", { exact: true })).toHaveCount(2);
});

test("el contador muestra valores intermedios en ficha y promociones, interrumpe cambios rápidos y respeta movimiento reducido", async ({
  page,
}) => {
  for (const [url, selector] of [
    [
      "/vista-previa/producto/proteina-de-prueba",
      ".product-price-main > strong .animated-amount-visual",
    ],
    [
      "/vista-previa/ofertas",
      ".home-offer-price strong .animated-amount-visual",
    ],
  ]) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(url);
    const value = page.locator(selector).first();
    await expect(value).toHaveAttribute("data-value", /\$\s30\.000/);
    // Record the visual overlay, independently from the real accessible amount.
    await value.evaluate((node) => {
      const samples: string[] = [];
      (window as unknown as { priceSamples: string[] }).priceSamples = samples;
      new MutationObserver(() =>
        samples.push((node as HTMLElement).dataset.value ?? ""),
      ).observe(node, { attributes: true, attributeFilter: ["data-value"] });
    });
    await page
      .getByRole("radio", { name: "Mercado Pago", exact: true })
      .check();
    await expect(value).toHaveAttribute("data-value", /\$\s34\.000/);
    const samples = await page.evaluate(
      () => (window as unknown as { priceSamples: string[] }).priceSamples,
    );
    expect(
      samples.some((sample) => {
        const normalized = sample.replace(/\s/g, " ");
        return normalized !== "$ 30.000" && normalized !== "$ 34.000";
      }),
    ).toBe(true);
    await page
      .getByRole("radio", { name: "Transferencia", exact: true })
      .check();
    await page
      .getByRole("radio", { name: "Mercado Pago", exact: true })
      .check();
    await expect(value).toHaveAttribute("data-value", /\$\s34\.000/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("radio", { name: "Transferencia", exact: true })
      .check();
    await expect(value).toHaveAttribute("data-value", /\$\s30\.000/);
    const button = page.locator(".premium-cta").first();
    expect(
      await button.evaluate((el) => getComputedStyle(el, "::after").display),
    ).toBe("none");
  }
});

test("las colecciones disponibles comparten ancho y alineación en escritorio y celular", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const boxes = await page
      .locator(".home-collection > .container")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const { x, width } = node.getBoundingClientRect();
          return { x, width };
        }),
      );
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toEqual(boxes[1]);
    expect(boxes[0].width).toBeLessThanOrEqual(1280);
  }
});
