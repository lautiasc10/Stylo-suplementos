import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import type { Promotion } from "../../src/modules/commerce/promotions";

const catalog = demoCatalog();
catalog.products[1].variants[0].stock = 40;
const protein = catalog.products[0].variants[0];
const creatine = catalog.products[1].variants[0];
const base = { active: true, startsAt: null, endsAt: null };
const promotions: Promotion[] = [
  {
    ...base,
    id: "11111111-1111-4111-8111-111111111111",
    name: "Rebaja de prueba",
    kind: "sale",
    components: [{ variantId: protein.id, quantity: 1 }],
    listPrice: 3400000,
    cashPrice: 3000000,
  },
  {
    ...base,
    id: "22222222-2222-4222-8222-222222222222",
    name: "Cantidad de prueba",
    kind: "quantity",
    components: [{ variantId: creatine.id, quantity: 15 }],
    listPrice: 2800000,
    cashPrice: 2400000,
  },
  {
    ...base,
    id: "33333333-3333-4333-8333-333333333333",
    name: "Combo de prueba",
    kind: "bundle",
    components: [
      { variantId: protein.id, quantity: 1 },
      { variantId: creatine.id, quantity: 1 },
    ],
    listPrice: 6000000,
    cashPrice: 5000000,
  },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ catalog, promotions }) => {
      if (!localStorage.getItem("stylo.promotion-test-seeded")) {
        localStorage.setItem(
          "stylo.catalog-preview.v1",
          JSON.stringify({ catalog, images: {} }),
        );
        localStorage.setItem(
          "stylo.promotions-preview.v1",
          JSON.stringify({ revision: 0, promotions }),
        );
        localStorage.setItem("stylo.promotion-test-seeded", "1");
      }
    },
    { catalog, promotions },
  );
});

test("las promociones comparan el mismo medio de pago sin mover las tarjetas y conservan la selección en el carrito", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/ofertas");
  const cards = page.locator(".home-offer");
  await expect(cards).toHaveCount(3);
  const sale = cards.filter({
    has: page.getByRole("heading", { name: "Rebaja de prueba" }),
  });
  await expect(sale.locator(".home-offer-price strong")).toHaveText("$ 30.000");
  await expect(sale.locator("del")).toHaveText("$ 41.000");
  await expect(sale.locator(".home-offer-saving")).toHaveText(
    "Ahorrás $ 11.000",
  );
  await expect(sale.locator(".home-offer-discount")).toHaveText("−27%");
  const bounds = await sale.boundingBox();
  await page.getByRole("radio", { name: "Mercado Pago", exact: true }).check();
  await expect(sale.locator(".home-offer-price strong")).toHaveText("$ 34.000");
  await expect(sale.locator("del")).toHaveText("$ 45.000");
  expect((await sale.boundingBox())?.height).toBe(bounds?.height);
  await sale
    .getByRole("button", {
      name: "Agregar promoción Rebaja de prueba al carrito",
    })
    .click();
  await expect(sale.locator(".home-offer-add")).toHaveAttribute(
    "data-added",
    "true",
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Abrir carrito, 1 unidades" }).click();
  await expect(
    page.getByRole("dialog").locator('input[value="mercado-pago"]'),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("el más de cantidad agrega el mínimo, el de combo agrega todos sus componentes y los enlaces respetan la variante", async ({
  page,
}) => {
  await page.goto("/vista-previa/ofertas");
  await page
    .getByRole("button", {
      name: "Agregar promoción Cantidad de prueba al carrito",
    })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("stylo.cart-preview.v1") ?? "[]"),
      ),
    )
    .toEqual([{ variantId: creatine.id, quantity: 15 }]);
  await page
    .getByRole("button", {
      name: "Agregar promoción Combo de prueba al carrito",
    })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("stylo.cart-preview.v1") ?? "[]"),
      ),
    )
    .toEqual([
      { variantId: creatine.id, quantity: 16 },
      { variantId: protein.id, quantity: 1 },
    ]);
  const bundle = page
    .locator(".home-offer")
    .filter({ has: page.getByRole("heading", { name: "Combo de prueba" }) });
  await expect(bundle.locator(".home-offer-products")).toHaveAttribute(
    "data-count",
    "2",
  );
  await expect(
    bundle.getByRole("link", { name: "Ver promoción", exact: true }),
  ).toHaveAttribute(
    "href",
    `/vista-previa/producto/${catalog.products[0].slug}?variante=${protein.id}`,
  );
});

test("un stock que cambió rechaza el combo entero y se ven todas las publicaciones disponibles", async ({
  page,
}) => {
  await page.goto("/vista-previa/ofertas");
  await expect(page.locator(".home-offer")).toHaveCount(3);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("stylo.catalog-preview.v1")!);
    saved.catalog.products[1].variants[0].stock = 0;
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(saved));
  });
  await page
    .getByRole("button", {
      name: "Agregar promoción Combo de prueba al carrito",
    })
    .click();
  await expect(page.locator("#promociones").getByRole("alert")).toContainText(
    "ya no está disponible",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("stylo.cart-preview.v1")),
  ).toBeNull();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("stylo.catalog-preview.v1")!);
    saved.catalog.products[1].variants[0].stock = 40;
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(saved));
    const offers = JSON.parse(
      localStorage.getItem("stylo.promotions-preview.v1")!,
    );
    offers.promotions.push({
      ...offers.promotions[0],
      id: "44444444-4444-4444-8444-444444444444",
      name: "Cuarta publicación",
    });
    localStorage.setItem("stylo.promotions-preview.v1", JSON.stringify(offers));
    window.dispatchEvent(new Event("stylo-preview-change"));
  });
  await expect(page.locator(".home-offer")).toHaveCount(4);
});
