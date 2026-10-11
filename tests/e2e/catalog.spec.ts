import { test, expect, type Page } from "@playwright/test";
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

async function openFilters(page: Page) {
  const panel = page.locator(".catalog-filter-panel");
  if (
    !(await panel.evaluate((element) => (element as HTMLDetailsElement).open))
  )
    await panel.locator(":scope > summary").click();
}

async function chooseFilter(page: Page, name: string, value: string) {
  await openFilters(page);
  const input = page.locator(
    `.catalog-filters input[name="${name}"][value="${value}"]`,
  );
  const group = input.locator("xpath=ancestor::details[1]");
  if (
    !(await group.evaluate((element) => (element as HTMLDetailsElement).open))
  )
    await group.locator(":scope > summary").click();
  await input.check();
}

test("catálogo filtra por la misma variante y conserva agotados", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa");
  await expect(page.locator(".product-card")).toHaveCount(4);
  await chooseFilter(page, "sabor", "Vainilla");
  await chooseFilter(page, "disponibilidad", "in-stock");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(
    page.getByRole("heading", { name: "No encontramos coincidencias." }),
  ).toBeVisible();
  await chooseFilter(page, "disponibilidad", "out-of-stock");
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
  await openFilters(page);
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
    await chooseFilter(page, "categoria", "creatinas");
    await chooseFilter(page, "orden", "price-asc");
    await page.getByLabel("Buscá por producto o marca").fill("creatina");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/q=creatina/);
    expect(new URL(page.url()).searchParams.get("categoria")).toBe("creatinas");
    expect(new URL(page.url()).searchParams.get("orden")).toBe("price-asc");
    await expect(page.getByLabel("Buscá por producto o marca")).toHaveValue(
      "creatina",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Creatinas",
    );
  } finally {
    await context.close();
  }
});

test("el lateral combina categoría, marca, sabor y orden y permite quitar un filtro", async ({
  page,
}) => {
  await page.goto("/vista-previa");
  await chooseFilter(page, "categoria", "proteinas");
  await chooseFilter(page, "marca", "marca-de-prueba-a");
  await chooseFilter(page, "sabor", "Chocolate");
  await chooseFilter(page, "orden", "price-desc");
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
  await expect(page.locator('input[name="sabor"][value=""]')).toBeChecked();
  await expect(
    page.locator('input[name="marca"][value="marca-de-prueba-a"]'),
  ).toBeChecked();
  await expect(
    page.locator('input[name="categoria"][value="proteinas"]'),
  ).toBeChecked();
  await expect(
    page.locator('input[name="orden"][value="price-desc"]'),
  ).toBeChecked();
  await openFilters(page);
  const bounds = await page
    .getByRole("button", { name: "Aplicar filtros" })
    .boundingBox();
  expect(bounds!.width).toBeLessThan(160);
  expect(bounds!.height).toBeGreaterThanOrEqual(48);
});

test("el panel lateral conserva selección con teclado y al cambiar a celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/vista-previa");
  const sidebar = page.locator(".catalog-sidebar");
  const panel = page.locator(".catalog-filter-panel");
  const left = await sidebar.boundingBox();
  const card = await page.locator(".product-card").first().boundingBox();
  expect(left!.x + left!.width).toBeLessThan(card!.x);

  await chooseFilter(page, "categoria", "");
  await page.locator('input[name="categoria"][value=""]').focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.locator('input[name="categoria"][value="proteinas"]'),
  ).toBeChecked();
  await expect(
    page.locator(".catalog-filter-group").first().locator("summary"),
  ).toContainText("Proteínas");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).not.toHaveAttribute("open", "");
  await expect(
    page.getByRole("button", { name: "Aplicar filtros" }),
  ).toBeHidden();
  await panel.locator(":scope > summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Aplicar filtros" }),
  ).toBeVisible();
  await expect(
    page.locator('input[name="categoria"][value="proteinas"]'),
  ).toBeChecked();
  await chooseFilter(page, "sabor", "Chocolate");
  await chooseFilter(page, "disponibilidad", "in-stock");
  await page.getByLabel("Desde (ARS)").fill("40000");
  await page.getByLabel("Hasta (ARS)").fill("46000");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toMatchObject({
    categoria: "proteinas",
    sabor: "Chocolate",
    disponibilidad: "in-stock",
    min: "40000",
    max: "46000",
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByRole("button", { name: "Aplicar filtros" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("la galería automática sincroniza variantes y la ficha conserva sus fotos", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.addInitScript(
    (fixture) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(fixture)),
    galleryFixture(),
  );
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card");
  await card
    .locator(".product-image-gallery")
    .evaluate((element) =>
      element.scrollIntoView({ behavior: "instant", block: "center" }),
    );
  await expect(
    card.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await expect(card.locator(".product-gallery-controls")).toHaveCount(0);
  await expect(card.locator(".product-image-count")).toHaveCount(0);
  await page.clock.runFor(3100);
  await expect(
    card.getByAltText("Chocolate dorso", { exact: true }),
  ).toBeVisible();
  await expect(card.locator(".product-prices")).toContainText("45.000,00");
  await page.clock.runFor(3100);
  await expect(
    card.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await expect(card.locator(".product-card-variant")).toContainText("Vainilla");
  await expect(card.locator(".product-prices")).toContainText("47.000,00");
  await expect(card.locator(".stock-badge")).toHaveText("Sin stock");
  await expect(
    card.getByRole("link", { name: "Ver variantes", exact: true }),
  ).toHaveAttribute("href", /variante=00000000-0000-4000-8000-000000000051$/);
  await page.clock.runFor(3100);
  await expect(
    card.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await card.getByRole("link", { name: "Ver variantes", exact: true }).click();
  await page
    .getByRole("button", { name: "Ver Chocolate dorso", exact: true })
    .click();
  await expect(
    page.getByAltText("Chocolate dorso", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Presentación", { exact: true })
    .selectOption({ label: "Vainilla · 1 kg · Envase · Sin stock" });
  await expect(
    page.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByAltText("Chocolate dorso", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".product-sku")).toHaveText("DEMO-1-B");
});

test("la galería pausa con foco y respeta movimiento reducido en vivo", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.addInitScript(
    (fixture) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(fixture)),
    galleryFixture(),
  );
  await page.goto("/vista-previa?q=proteina");
  const gallery = page.locator(".product-image-gallery");
  await gallery.evaluate((element) =>
    element.scrollIntoView({ behavior: "instant", block: "center" }),
  );
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(3100);
  await expect(
    page.getByAltText("Chocolate dorso", { exact: true }),
  ).toBeVisible();
  await gallery.locator(".product-frame-link").focus();
  await expect(gallery).not.toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(11000);
  await expect(
    page.getByAltText("Chocolate dorso", { exact: true }),
  ).toBeVisible();
  await gallery
    .locator(".product-frame-link")
    .evaluate((element) => element.blur());
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(3100);
  await expect(
    page.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(11000);
  await expect(
    page.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await expect(gallery).not.toHaveAttribute("data-animated", "true");
  await expect(gallery.getByRole("button")).toHaveCount(0);
});

test("una foto por variante alterna sus datos y respeta sabor, precio y disponibilidad", async ({
  page,
}) => {
  const fixture = galleryFixture();
  fixture.catalog.products[0].images.splice(1, 1);
  await page.clock.install();
  await page.addInitScript(
    (data) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)),
    fixture,
  );
  await page.goto("/vista-previa?q=proteina");
  const card = page.locator(".product-card");
  await card.locator(".product-image-gallery").scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.clock.runFor(3100);
  await expect(
    card.getByRole("img", { name: "Vainilla frente", exact: true }),
  ).toBeVisible();
  await expect(card.locator(".product-card-variant")).toContainText("Vainilla");
  await expect(card.locator(".product-prices")).toContainText("47.000,00");
  await expect(card.locator(".stock-badge")).toHaveText("Sin stock");
  await card.getByRole("link", { name: "Ver variantes", exact: true }).click();
  await expect(page.locator(".product-sku")).toHaveText("DEMO-1-B");

  await page.goto("/vista-previa?q=proteina&sabor=Chocolate");
  await expect(
    card.getByRole("img", { name: "Chocolate frente", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Siguiente imagen", exact: true }),
  ).toHaveCount(0);
  await page.clock.runFor(11000);
  await expect(card.locator(".product-card-variant")).toContainText(
    "Chocolate",
  );

  await page.goto(
    "/vista-previa?q=proteina&min=46000&max=48000&disponibilidad=out-of-stock",
  );
  await expect(
    card.getByRole("img", { name: "Vainilla frente", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Siguiente imagen", exact: true }),
  ).toHaveCount(0);
  await expect(card.locator(".product-prices")).toContainText("47.000,00");
});

test("los fragmentos cambian solos, desaparecen y se cancelan con movimiento reducido", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.addInitScript(
    (fixture) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(fixture)),
    galleryFixture(),
  );
  await page.goto("/vista-previa?q=proteina");
  const gallery = page.locator(".product-image-gallery");
  await gallery.evaluate((element) =>
    element.scrollIntoView({ behavior: "instant", block: "center" }),
  );
  await gallery.hover({ force: true });
  const before = await gallery.boundingBox();
  await expect(
    page.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(2900);
  await expect(
    page.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(200);
  await expect(
    page.getByAltText("Chocolate dorso", { exact: true }),
  ).toBeVisible();
  await expect(gallery).toHaveAttribute("data-animated", "true");
  await expect(gallery.locator(".product-image-fragments")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(gallery.getByRole("button")).toHaveCount(0);
  const after = await gallery.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
  await page.clock.runFor(900);
  await expect(gallery.locator(".product-image-fragments")).toHaveCount(0);
  await expect(gallery.locator(".product-frame-outgoing")).toHaveCount(0);
  await expect(gallery).not.toHaveAttribute("data-animated", "true");
  await page.clock.runFor(2200);
  await expect(
    page.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(gallery.locator(".product-image-fragments")).toHaveCount(0);
  await expect(gallery).not.toHaveAttribute("data-animated", "true");
  await page.clock.runFor(10000);
  await expect(
    page.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
});

test("las tarjetas escalonan el inicio y suspenden los cambios fuera de pantalla", async ({
  page,
}) => {
  const fixture = galleryFixture();
  fixture.catalog.products[0].images.splice(1, 1);
  const creatine = fixture.catalog.products[1];
  creatine.images = fixture.catalog.products[0].images.map((image, index) => {
    const path = `${creatine.id}/00000000-0000-4000-8000-00000000090${index}.webp`;
    fixture.images[path] = fixture.images[image.path];
    return {
      ...image,
      path,
      id: `00000000-0000-4000-8000-00000000090${index}`,
      variantId: creatine.variants[0].id,
      alt: `Creatina foto ${index + 1}`,
    };
  });
  await page.setViewportSize({ width: 1440, height: 1600 });
  await page.clock.install();
  await page.addInitScript(
    (data) =>
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data)),
    fixture,
  );
  await page.goto("/vista-previa?q=prueba");
  const creatineCard = page.locator(".product-card").filter({
    has: page.getByRole("heading", {
      name: "Creatina de prueba",
      exact: true,
    }),
  });
  const proteinCard = page.locator(".product-card").filter({
    has: page.getByRole("heading", {
      name: "Proteína de prueba",
      exact: true,
    }),
  });
  await creatineCard.locator(".product-image-gallery").scrollIntoViewIfNeeded();
  await expect(
    creatineCard.getByAltText("Creatina foto 1", { exact: true }),
  ).toBeVisible();
  await expect(
    proteinCard.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(3100);
  await expect(
    creatineCard.getByAltText("Creatina foto 2", { exact: true }),
  ).toBeVisible();
  await expect(
    proteinCard.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(320);
  await expect(
    proteinCard.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 250 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect
    .poll(() =>
      creatineCard
        .locator(".product-image-gallery")
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeGreaterThan(250);
  await expect(
    proteinCard.locator(".product-image-gallery"),
  ).not.toHaveAttribute("data-animated", "true");
  await page.clock.runFor(3600);
  await expect(
    creatineCard.getByAltText("Creatina foto 2", { exact: true }),
  ).toHaveCount(1);
  await expect(
    proteinCard.getByAltText("Vainilla frente", { exact: true }),
  ).toHaveCount(1);
});
