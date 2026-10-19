import { expect, test, type Page } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { createSearchIndex } from "../../src/modules/catalog/search";

async function fixture(page: Page) {
  const index = createSearchIndex(demoCatalog());
  let requests = 0;
  await page.route("**/api/buscar", (route) => {
    requests++;
    return route.fulfill({ json: index });
  });
  return () => requests;
}

test("Ctrl K permite buscar desde el hero sin bloquear la navegación", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/");
  await expect(page.locator(".search-trigger")).toHaveAttribute(
    "aria-haspopup",
    "dialog",
  );
  await page.keyboard.press("Control+k");
  const panel = page.locator(".search-dialog");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("combobox", { name: "Buscar productos" }),
  ).toBeFocused();
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-navigation",
    "ready",
  );
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
});
test("panel, búsqueda tolerante, teclado y foco sin consultas por letra", async ({
  page,
}, info) => {
  const requests = await fixture(page);
  await page.goto("/catalogo");
  await expect(page.locator(".search-trigger")).toHaveAttribute(
    "aria-haspopup",
    "dialog",
  );
  await page.keyboard.press("Control+k");
  const panel = page.getByRole("dialog", { name: "Encontrá tu próximo STYLO" }),
    input = panel.getByRole("combobox", { name: "Buscar productos" });
  await expect(panel).toBeVisible();
  await expect(input).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  const box = await panel.boundingBox();
  if (info.project.name === "mobile") {
    expect(box!.x).toBe(0);
    expect(box!.y).toBe(0);
    expect(box!.width).toBe(page.viewportSize()!.width);
  } else expect(box!.width).toBeLessThanOrEqual(860);
  await input.fill("protiena");
  await expect(
    panel.getByRole("group", { name: "Productos" }).getByRole("option"),
  ).toHaveCount(1);
  await expect(panel.getByRole("option").first()).toContainText(
    "Proteína de prueba",
  );
  await input.fill("vainilla");
  await expect(panel.getByRole("option").first()).toContainText("Sin stock");
  await input.press("ArrowDown");
  await expect(input).toBeFocused();
  const active = await input.getAttribute("aria-activedescendant");
  expect(active).toBeTruthy();
  await expect(page.locator(`[id="${active}"]`)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(requests()).toBe(1);
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "Buscar productos", exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(
      `/producto/proteina-de-prueba\\?variante=${demoCatalog().products[0].variants[1].id}`,
    ),
  );
  expect(requests()).toBe(1);
});

test("el panel contiene el foco y cierra con X o con el fondo", async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto("/catalogo");
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  const panel = page.locator(".search-dialog");
  await expect(panel).toBeVisible();
  await page
    .getByRole("combobox", { name: "Buscar productos" })
    .fill("no-hay-producto-xyz");
  await expect(
    panel.getByRole("heading", { name: /No encontramos/ }),
  ).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await panel.evaluate((d) => d.contains(document.activeElement)),
    ).toBe(true);
  }
  await panel.getByRole("button", { name: "Cerrar búsqueda" }).click();
  await expect(panel).not.toBeVisible();
  if (info.project.name === "desktop") {
    await page.keyboard.press("Meta+k");
    await expect(panel).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(panel).not.toBeVisible();
  }
});

test("las búsquedas recientes guardan cinco entradas y permiten borrar una o todas", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/catalogo");
  for (let i = 0; i < 6; i++) {
    await page
      .getByRole("link", { name: "Buscar productos", exact: true })
      .click();
    const input = page.getByRole("combobox", {
      name: "Buscar productos",
      exact: true,
    });
    await input.fill(`busqueda ${i}`);
    await input.press("Enter");
    await expect(page).toHaveURL(new RegExp(`q=busqueda(?:%20|\\+)${i}`));
  }
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("stylo.search-recents.v1")!),
  );
  expect(saved).toEqual([
    "busqueda 5",
    "busqueda 4",
    "busqueda 3",
    "busqueda 2",
    "busqueda 1",
  ]);
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Limpiar búsqueda", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Borrar búsqueda busqueda 5", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Borrar búsqueda busqueda 5",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Borrar todo", exact: true }).click();
  await expect(page.locator(".search-recents li")).toHaveCount(0);
});

test("error de carga permite reintentar y resultados agrupan categorías y marcas", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/buscar", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { error: "unavailable" } })
      : route.fulfill({ json: createSearchIndex(demoCatalog()) });
  });
  await page.goto("/catalogo");
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  const panel = page.locator(".search-dialog");
  await expect(panel.getByRole("alert")).toBeVisible();
  await panel.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  const input = panel.getByRole("combobox", { name: "Buscar productos" });
  await input.fill("proteínas");
  await expect(panel.getByRole("group", { name: "Categorías" })).toBeVisible();
  await input.fill("marca prueba a");
  await expect(panel.getByRole("group", { name: "Marcas" })).toBeVisible();
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  await expect(input).toBeFocused();
  expect(attempts).toBe(2);
});

test("cancelar una carga no permite que una respuesta vieja reemplace la nueva", async ({
  page,
}) => {
  let release: () => void = () => {},
    started: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r)),
    requestStarted = new Promise<void>((r) => (started = r));
  let calls = 0;
  await page.route("**/api/buscar", async (route) => {
    calls++;
    if (calls === 1) {
      started();
      await gate;
      try {
        await route.fulfill({
          json: { products: [], brands: [], categories: [] },
        });
      } catch {}
      return;
    }
    await route.fulfill({ json: createSearchIndex(demoCatalog()) });
  });
  await page.goto("/catalogo");
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  await requestStarted;
  await page.keyboard.press("Escape");
  await expect(page.locator(".search-dialog")).not.toBeVisible();
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Buscar productos" })
    .fill("creatina");
  await expect(page.getByRole("option").first()).toContainText(
    "Creatina de prueba",
  );
  release();
  await expect(page.getByRole("option").first()).toContainText(
    "Creatina de prueba",
  );
});

test("resultados comparten filtros, paginan y recuperan la URL con Atrás", async ({
  page,
}) => {
  const catalog = demoCatalog(),
    base = catalog.products[0];
  const uuid = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  catalog.products = Array.from({ length: 17 }, (_, i) => ({
    ...base,
    id: uuid(200 + i),
    slug: `proteina-prueba-${i}`,
    name: `Proteína de prueba ${String(i).padStart(2, "0")}`,
    variants: base.variants.map((v, j) => ({
      ...v,
      id: uuid(500 + i * 2 + j),
      sku: `SEARCH-${i}-${j}`,
      listPrice: v.listPrice + i * 10000,
      cashPrice: v.cashPrice + i * 10000,
    })),
    images: [],
  }));
  await page.addInitScript(
    (catalog) =>
      localStorage.setItem(
        "stylo.catalog-preview.v1",
        JSON.stringify({ catalog, images: {} }),
      ),
    catalog,
  );
  await page.goto("/vista-previa/buscar?q=proteina");
  await expect(page.locator(".search-product-grid .product-card")).toHaveCount(
    12,
  );
  await page.getByRole("link", { name: "Siguiente", exact: true }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.locator(".search-product-grid .product-card")).toHaveCount(
    5,
  );
  await page.goBack();
  await expect(page.locator(".search-product-grid .product-card")).toHaveCount(
    12,
  );
  const filters = page.getByRole("form", { name: "Filtrar resultados" });
  const toggle = page.locator(".search-results-filters .catalog-panel-toggle");
  if (await toggle.isVisible()) await toggle.click();
  await filters
    .getByLabel("Categoría", { exact: true })
    .selectOption("proteinas");
  await filters
    .getByLabel("Marca", { exact: true })
    .selectOption("marca-de-prueba-a");
  await filters.getByLabel("Precio mínimo", { exact: true }).fill("45800");
  await filters.getByLabel("Solo con stock", { exact: true }).check();
  await filters
    .getByLabel("Ordenar por", { exact: true })
    .selectOption("price-desc");
  await page
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  await expect(page).toHaveURL(/categoria=proteinas/);
  await expect(page).toHaveURL(/orden=price-desc/);
  await expect(page.locator(".search-product-grid .product-card")).toHaveCount(
    9,
  );
  await expect(
    page.getByRole("link", { name: "Quitar filtro Proteínas", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page).toHaveURL(/buscar\?q=proteina$/);
});

test("sin JavaScript la lupa, la búsqueda y los filtros conservan navegación real", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: info.project.use.viewport,
  });
  try {
    const page = await context.newPage();
    await page.goto(`${info.project.use.baseURL}/catalogo`);
    await page
      .getByRole("link", { name: "Buscar productos", exact: true })
      .click();
    await expect(page).toHaveURL(/\/buscar$/);
    await page
      .getByRole("searchbox", { name: "Buscar productos", exact: true })
      .fill("creatina");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/q=creatina/);
    await page.getByLabel("Solo con stock", { exact: true }).check();
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/stock=1/);
  } finally {
    await context.close();
  }
});

test("el precio sugerido respeta rebajas y no anticipa un descuento por cantidad", async ({
  page,
}) => {
  const catalog = demoCatalog(),
    variant = catalog.products[0].variants[0];
  const promotions = [
    {
      id: "00000000-0000-4000-8000-000000000901",
      name: "Rebaja de prueba",
      kind: "sale",
      active: true,
      components: [{ variantId: variant.id, quantity: 1 }],
      listPrice: 4000000,
      cashPrice: 3800000,
      startsAt: null,
      endsAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000902",
      name: "Cantidad de prueba",
      kind: "quantity",
      active: true,
      components: [{ variantId: variant.id, quantity: 3 }],
      listPrice: 3000000,
      cashPrice: 2800000,
      startsAt: null,
      endsAt: null,
    },
  ];
  await page.addInitScript(
    ({ catalog, promotions }) => {
      localStorage.setItem(
        "stylo.catalog-preview.v1",
        JSON.stringify({ catalog, images: {} }),
      );
      localStorage.setItem(
        "stylo.promotions-preview.v1",
        JSON.stringify({ revision: 0, promotions }),
      );
    },
    { catalog, promotions },
  );
  await page.goto("/vista-previa");
  await page
    .getByRole("link", { name: "Buscar productos", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Buscar productos" })
    .fill("proteina");
  await expect(
    page.locator(".search-option-product .search-option-price"),
  ).toContainText("40.000");
});
