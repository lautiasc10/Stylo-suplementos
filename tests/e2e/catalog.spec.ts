import { test, expect } from "@playwright/test";
import { importColumns } from "../../src/modules/catalog/import";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { readFileSync } from "node:fs";

function galleryFixture() {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  const [chocolate, vanilla] = product.variants;
  const paths = [
    "00000000-0000-4000-8000-000000000201.webp",
    "00000000-0000-4000-8000-000000000202.webp",
    "00000000-0000-4000-8000-000000000203.webp",
  ].map((name) => `${product.id}/${name}`);
  product.images = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      path: paths[0],
      alt: "Chocolate frente",
      variantId: chocolate.id,
      position: 0,
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      path: paths[1],
      alt: "Chocolate dorso",
      variantId: chocolate.id,
      position: 1,
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      path: paths[2],
      alt: "Vainilla frente",
      variantId: vanilla.id,
      position: 2,
    },
  ];
  // Existing local files are test payloads only, never added to the demo catalog.
  const sources = [
    "logo-principal.webp",
    "logo-horizontal.webp",
    "logo-completo.webp",
  ];
  const images = Object.fromEntries(
    paths.map((path, index) => [
      path,
      `data:image/webp;base64,${readFileSync(`public/branding/${sources[index]}`).toString("base64")}`,
    ]),
  );
  return { catalog, images };
}

const importRow = [
  "proteina-de-prueba",
  "Proteína de prueba",
  "marca-de-prueba-a",
  "proteinas",
  "Descripción actualizada",
  "DEMO-1-A",
  "Chocolate",
  "1 kg",
  "Envase",
  "49000,29",
  "45000.10",
  "4",
  "true",
];
const csv = (...rows: string[][]) =>
  Buffer.from(
    [Array.from(importColumns), ...rows].map((row) => row.join(";")).join("\n"),
  );

test("catálogo filtra por la misma variante y conserva agotados", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa");
  await expect(page.locator(".product-card")).toHaveCount(4);
  await page.getByLabel("Sabor", { exact: true }).selectOption("Vainilla");
  await page.getByText("Precio y disponibilidad").click();
  await page.getByLabel("Disponibilidad").selectOption("in-stock");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(
    page.getByRole("heading", { name: "No encontramos coincidencias." }),
  ).toBeVisible();
  await page.getByLabel("Disponibilidad").selectOption("out-of-stock");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("47.000,00");
  await expect(page.locator(".product-card .stock-badge")).toHaveText(
    "Sin stock",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("búsqueda, orden por lista y selección de variante actualizan la ficha", async ({
  page,
}) => {
  await page.goto("/vista-previa?orden=price-asc");
  await expect(page.locator(".product-card h2").first()).toHaveText(
    "Shaker de prueba",
  );
  await page.getByLabel("Buscá por producto o marca").fill("proteina");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Ver variantes" }).click();
  await expect(page.locator(".product-sku")).toHaveText("DEMO-1-A");
  await page
    .getByLabel("Presentación", { exact: true })
    .selectOption({ label: "Vainilla · 1 kg · Envase · Sin stock" });
  await expect(page.locator(".product-sku")).toHaveText("DEMO-1-B");
  await expect(page.locator(".product-prices")).toContainText("47.000,00");
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
});

test("edición de precio, stock e imágenes persiste sin tocar la tienda real", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  const variant = page.locator(".variant-editor").first();
  await variant
    .getByLabel("Precio de lista (ARS)", { exact: true })
    .fill("51000,29");
  await variant.getByLabel("Stock", { exact: true }).fill("2");
  await page
    .getByLabel("Subir imágenes")
    .setInputFiles("public/branding/logo-principal.webp");
  await page
    .getByLabel("Descripción de imagen 1")
    .fill("Imagen de prueba para chocolate");
  await page
    .getByLabel("Imagen de", { exact: true })
    .selectOption({ label: "DEMO-1-A" });
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await expect(page.locator(".product-prices")).toContainText("51.000,29");
  await expect(
    page.getByRole("img", { name: "Imagen de prueba para chocolate" }),
  ).toHaveAttribute("src", /^data:image\/webp;base64,/);
  await page.reload();
  await expect(page.locator(".product-prices")).toContainText("51.000,29");
  await page.goto("/catalogo");
  await expect(page.locator(".product-card")).toHaveCount(0);
});

test("alta de marca y producto, ocultación y stock bajo", async ({ page }) => {
  await page.goto("/vista-previa/gestion");
  await page.getByRole("button", { name: "Marcas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva marca", exact: true }).click();
  await page
    .getByLabel("Nombre", { exact: true })
    .fill("Marca local de prueba");
  await page.getByLabel("URL", { exact: true }).fill("marca-local");
  await page
    .getByLabel("Logo de la marca (opcional)")
    .setInputFiles("public/branding/logo-principal.webp");
  await expect(page.getByRole("button", { name: "Quitar logo" })).toBeVisible();
  await page
    .getByRole("button", { name: "Guardar marca", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  await page.getByRole("button", { name: "Productos", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo producto", exact: true })
    .click();
  await page
    .getByLabel("Nombre", { exact: true })
    .fill("Accesorio local de prueba");
  await page
    .getByLabel("Marca", { exact: true })
    .selectOption({ label: "Marca local de prueba" });
  await page.getByLabel("Visible en la tienda").check();
  await page.getByLabel("SKU", { exact: true }).fill("LOCAL-01");
  await page
    .getByLabel("Precio de lista (ARS)", { exact: true })
    .fill("5000.20");
  await page
    .getByLabel("Precio efectivo/transferencia (ARS)", { exact: true })
    .fill("4500");
  await page.getByLabel("Stock", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  await page.getByLabel("Umbral de stock bajo").fill("2");
  await page
    .getByRole("button", { name: "Guardar umbral", exact: true })
    .click();
  await expect(page.locator(".low-stock-list")).toContainText("LOCAL-01");
  const row = page
    .getByRole("row")
    .filter({ hasText: "Accesorio local de prueba" });
  await row.getByRole("button", { name: "Ocultar", exact: true }).click();
  await expect(row).toContainText("Oculto");
  await page.goto("/vista-previa");
  await expect(page.locator(".product-card")).toHaveCount(4);
});

test("CSV previsualiza antes de aplicar y conserva variantes omitidas", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  await page.getByRole("button", { name: "Carga masiva", exact: true }).click();
  await page.getByLabel("Archivo de catálogo").setInputFiles({
    name: "catalog.csv",
    mimeType: "text/csv",
    buffer: csv(importRow),
  });
  await expect(page.locator(".import-table")).toContainText("49.000,29");
  await expect(page.locator(".import-table")).toContainText(
    "Antes: $ 45.000,00",
  );
  const saved = await page.evaluate(() =>
    localStorage.getItem("stylo.catalog-preview.v1"),
  );
  expect(saved).toBeNull();
  await page
    .getByRole("button", { name: "Aplicar importación", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await expect(page.locator(".product-prices")).toContainText("49.000,29");
  await expect(
    page.getByLabel("Presentación", { exact: true }).locator("option"),
  ).toHaveCount(2);
});

test("Excel real se lee en el navegador y un lote duplicado queda bloqueado", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  await page.getByRole("button", { name: "Carga masiva", exact: true }).click();
  await page
    .getByLabel("Archivo de catálogo")
    .setInputFiles("tests/fixtures/catalog.xlsx");
  await expect(page.locator(".import-table")).toContainText("49.000,29");
  await page
    .getByRole("button", { name: "Aplicar importación", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  const before = await page.evaluate(() =>
    localStorage.getItem("stylo.catalog-preview.v1"),
  );
  await page.getByLabel("Archivo de catálogo").setInputFiles({
    name: "duplicados.csv",
    mimeType: "text/csv",
    buffer: csv(importRow, importRow),
  });
  await expect(page.locator(".import-panel [role=alert]")).toContainText(
    "duplicado",
  );
  await expect(
    page.getByRole("button", { name: "Aplicar importación", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("stylo.catalog-preview.v1")),
  ).toBe(before);
});

test("gestión real permanece protegida y la vista previa rechaza hosts externos", async ({
  page,
  request,
}) => {
  await page.goto("/admin/catalogo");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const remote = await request.get("/vista-previa", {
    headers: { Host: "tienda.example" },
  });
  expect(remote.status()).toBe(404);
  const product = await request.get("/producto/proteina-de-prueba");
  expect(product.status()).toBe(404);
});

test("filtros públicos conservan navegación sin JavaScript", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: testInfo.project.use.baseURL,
    viewport: testInfo.project.use.viewport,
  });
  try {
    const page = await context.newPage();
    await page.goto("/catalogo");
    await page.getByLabel("Buscá por producto o marca").fill("creatina");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/q=creatina/);
    await expect(page.getByLabel("Buscá por producto o marca")).toHaveValue(
      "creatina",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Nuestro catálogo",
    );
  } finally {
    await context.close();
  }
});

test("la franja combina categoría, marca, sabor y orden y permite quitar un filtro", async ({
  page,
}) => {
  await page.goto("/vista-previa");
  await page.getByLabel("Categoría", { exact: true }).selectOption("proteinas");
  await page
    .getByLabel("Marca", { exact: true })
    .selectOption("marca-de-prueba-a");
  await page.getByLabel("Sabor", { exact: true }).selectOption("Chocolate");
  await page.getByLabel("Ordenar", { exact: true }).selectOption("price-desc");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  const query = new URL(page.url()).searchParams;
  expect(Object.fromEntries(query)).toMatchObject({
    categoria: "proteinas",
    marca: "marca-de-prueba-a",
    sabor: "Chocolate",
    orden: "price-desc",
  });
  await page
    .getByRole("link", { name: "Quitar filtro Chocolate", exact: true })
    .click();
  await expect(page.getByLabel("Sabor", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Marca", { exact: true })).toHaveValue(
    "marca-de-prueba-a",
  );
  await expect(page.getByLabel("Categoría", { exact: true })).toHaveValue(
    "proteinas",
  );
  await expect(page.getByLabel("Ordenar", { exact: true })).toHaveValue(
    "price-desc",
  );
  const bounds = await page
    .getByRole("button", { name: "Aplicar filtros" })
    .boundingBox();
  expect(bounds!.width).toBeLessThan(160);
  expect(bounds!.height).toBeGreaterThanOrEqual(48);
});

test("las imágenes de una variante cambian sin modificar precios ni mezclar sabores", async ({
  page,
}) => {
  await page.addInitScript(
    (fixture) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(fixture)),
    galleryFixture(),
  );
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card");
  await expect(
    card.getByRole("img", { name: "Chocolate frente", exact: true }),
  ).toBeVisible();
  await card
    .getByRole("button", { name: "Siguiente imagen", exact: true })
    .click();
  await expect(
    card.getByRole("img", { name: "Chocolate dorso", exact: true }),
  ).toBeVisible();
  await expect(card).toContainText("45.000,00");
  await expect(card).toContainText("Chocolate · 1 kg");
  await expect(
    card.getByRole("img", { name: "Vainilla frente", exact: true }),
  ).toHaveCount(0);
  await card
    .getByRole("button", { name: "Imagen anterior", exact: true })
    .click();
  await expect(
    card.getByRole("img", { name: "Chocolate frente", exact: true }),
  ).toBeVisible();
  await card.getByRole("link", { name: "Ver variantes", exact: true }).click();
  await page
    .getByRole("button", { name: "Ver Chocolate dorso", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Chocolate dorso", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Presentación", { exact: true })
    .selectOption({ label: "Vainilla · 1 kg · Envase · Sin stock" });
  await expect(
    page.getByRole("img", { name: "Vainilla frente", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Chocolate dorso", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".product-sku")).toHaveText("DEMO-1-B");
});

test("la galería pausa al interactuar y responde al movimiento reducido en vivo", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(
    (fixture) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(fixture)),
    galleryFixture(),
  );
  await page.goto("/vista-previa?q=proteina");
  const gallery = page.locator(".product-image-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("img", { name: "Chocolate frente", exact: true }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await page.clock.runFor(5800);
  await expect(
    page.getByRole("img", { name: "Chocolate dorso", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Pausar cambio automático de imágenes",
      exact: true,
    })
    .click();
  await page.getByRole("heading", { level: 1 }).click();
  await page.clock.runFor(11000);
  await expect(
    page.getByRole("img", { name: "Chocolate dorso", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Reanudar cambio automático de imágenes",
      exact: true,
    })
    .click();
  await page.getByRole("heading", { level: 1 }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: /cambio automático de imágenes/ }),
  ).toHaveCount(0);
  await page.clock.runFor(11000);
  await expect(
    page.getByRole("img", { name: "Chocolate dorso", exact: true }),
  ).toBeVisible();
  await gallery
    .getByRole("button", { name: "Siguiente imagen", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Chocolate frente", exact: true }),
  ).toBeVisible();
  await expect(gallery).not.toHaveAttribute("data-animated", "true");
});
