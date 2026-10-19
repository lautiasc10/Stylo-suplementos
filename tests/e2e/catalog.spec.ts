import { test, expect, type Page } from "@playwright/test";
import { importColumns } from "../../src/modules/catalog/import";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { readFileSync } from "node:fs";

test("fichas compartidas, cambio de variante y ampliación accesible", async ({
  page,
}) => {
  const fixture = galleryFixture();
  const product = fixture.catalog.products[0];
  const [chocolate, vanilla] = product.variants;
  const source = Object.values(fixture.images)[0];
  product.informationImages = [
    {
      id: "00000000-0000-4000-8000-000000000301",
      path: `${product.id}/00000000-0000-4000-8000-000000000401.webp`,
      alt: "Ficha común de prueba",
      variantId: null,
      position: 0,
    },
    {
      id: "00000000-0000-4000-8000-000000000302",
      path: `${product.id}/00000000-0000-4000-8000-000000000402.webp`,
      alt: "Ficha específica vainilla",
      variantId: vanilla.id,
      position: 1,
    },
  ];
  for (const image of product.informationImages)
    fixture.images[image.path] = source;
  await page.addInitScript((state) => {
    if (!localStorage.getItem("stylo.catalog-preview.v1"))
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(state));
  }, fixture);
  await page.goto(
    `/vista-previa/producto/${product.slug}?variante=${chocolate.id}`,
  );
  await page.locator(".product-information summary").click();
  await expect(page.locator(".product-information-grid li")).toHaveCount(1);
  const shared = page
    .locator(".product-information-grid")
    .getByRole("link", { name: /Ficha común de prueba/ });
  await shared.click();
  await expect(
    page.getByRole("dialog", { name: "Ficha común de prueba" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cerrar ficha informativa" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".product-information-dialog")).not.toBeVisible();
  await expect(shared).toBeFocused();
  await page.locator(`.variant-chip[href="?variante=${vanilla.id}"]`).click();
  await expect(page.locator(".product-information-grid li")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/vista-previa/gestion");
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  const info = page.locator("#editor-fichas");
  await expect(
    info.getByLabel("Descripción de ficha informativa 1"),
  ).toHaveValue("Ficha común de prueba");
  await info
    .getByLabel("Descripción de ficha informativa 1")
    .fill("Ficha común editada");
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await page.goto(`/vista-previa/producto/${product.slug}`);
  await page.locator(".product-information summary").click();
  await expect(
    page
      .locator(".product-information-grid")
      .getByRole("link", { name: /Ficha común editada/ }),
  ).toBeVisible();
});

test("productos se agrupan por marca y se buscan por nombre, sabor o SKU", async ({
  page,
}) => {
  const catalog = demoCatalog();
  catalog.brands[0].name = "ONE FIT";
  catalog.brands[0].slug = "marca-one-fit";
  catalog.brands[1].name = "STAR NUTRITION";
  catalog.brands[1].slug = "marca-star";
  catalog.brands.push({
    ...catalog.brands[0],
    id: "00000000-0000-4000-8000-000000000099",
    name: "XBODY",
    slug: "marca-xbody",
  });
  catalog.products[3].brandId = catalog.brands[2].id;
  await page.addInitScript(
    (state) => {
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(state));
    },
    { catalog, images: {} },
  );
  await page.goto("/vista-previa/gestion");
  const brands = page.locator(".admin-product-brand-heading h3");
  await expect(brands).toHaveText(["STAR NUTRITION", "ONE FIT", "XBODY"]);
  const search = page.getByRole("searchbox", { name: "Buscar productos" });
  await search.fill("demo-4-a");
  await expect(page.locator(".admin-product-card")).toHaveCount(1);
  await expect(page.locator(".admin-product-brand-heading h3")).toHaveText(
    "XBODY",
  );
  await search.fill("proteina vainilla");
  await expect(page.locator(".admin-product-card")).toHaveCount(1);
  await page.locator(".admin-product-card").click();
  await expect(
    page.getByRole("button", { name: "Guardar producto" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

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

async function closeMobileFilters(page: Page) {
  const panel = page.locator(".catalog-filter-panel");
  if (
    page.viewportSize()!.width < 960 &&
    (await panel.evaluate((element) => (element as HTMLDetailsElement).open))
  )
    await page
      .getByRole("button", { name: "Ver productos", exact: true })
      .click();
}

async function chooseFilter(
  page: Page,
  name: string,
  value: string,
  automatic = true,
) {
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
  if (automatic)
    await expect
      .poll(() => new URL(page.url()).searchParams.get(name) ?? "")
      .toBe(name === "orden" && value === "name" ? "" : value);
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
  await expect(
    page.getByRole("heading", { name: "No encontramos coincidencias." }),
  ).toBeVisible();
  await chooseFilter(page, "disponibilidad", "out-of-stock");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("47.000");
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
  await expect(page).toHaveURL(/q=proteina/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await closeMobileFilters(page);
  await page.getByRole("link", { name: "Ver variantes" }).click();
  await expect(page.locator(".gainer-flavor-picker")).toHaveAttribute(
    "data-selected-variant",
    demoCatalog().products[0].variants[0].id,
  );
  await expect(page.locator(".product-sku")).toHaveCount(0);
  await page
    .locator(".gainer-flavor-picker")
    .getByRole("link", {
      name: "Vainilla · 1 kg · Envase · Sin stock",
      exact: true,
    })
    .click();
  await expect(page.locator(".gainer-flavor-picker")).toHaveAttribute(
    "data-selected-variant",
    demoCatalog().products[0].variants[1].id,
  );
  await expect(
    page.locator("#contenido .editorial-pricing-list"),
  ).toContainText("47.000");
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
  const storedPrice = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("stylo.catalog-preview.v1")!).catalog
        .products[0].variants[0].listPrice,
  );
  expect(storedPrice).toBe(5100029);
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  await expect(
    page.locator("#contenido .editorial-pricing-list"),
  ).toContainText("51.000");
  await expect(
    page.getByRole("img", { name: "Imagen de prueba para chocolate" }),
  ).toHaveAttribute("src", /^data:image\/webp;base64,/);
  await page.reload();
  await expect(
    page.locator("#contenido .editorial-pricing-list"),
  ).toContainText("51.000");
  await page.goto("/catalogo");
  await expect(
    page.getByText("Proteína de prueba", { exact: true }),
  ).toHaveCount(0);
});

test("una variante nueva vacía se descarta y permite guardar sin completarla", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  const count = await page.locator(".variant-editor").count();
  await page
    .getByRole("button", { name: "Agregar variante", exact: true })
    .click();
  await expect(page.locator(".variant-editor")).toHaveCount(count + 1);
  await page
    .locator(".variant-editor")
    .last()
    .getByLabel(`Subir fotos de variante ${count + 1}`, { exact: true })
    .setInputFiles("public/branding/logo-principal.webp");
  await expect(
    page.locator(".variant-editor").last().locator(".image-editor"),
  ).toHaveCount(1);
  await page
    .getByRole("button", {
      name: `Descartar variante ${count + 1}`,
      exact: true,
    })
    .click();
  await expect(page.locator(".variant-editor")).toHaveCount(count);
  await expect(page.locator("#editor-fotos .image-editor")).toHaveCount(1);
  await expect(
    page.locator("#editor-fotos").getByLabel("Imagen de", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Agregar variante", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: /Descartar variante/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  await page.reload();
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  await expect(page.locator(".variant-editor")).toHaveCount(count);
});

test("reemplazar una foto conserva su orden, descripción y variante; un archivo inválido conserva la anterior", async ({
  page,
}) => {
  const fixture = galleryFixture();
  await page.addInitScript((data) => {
    if (!localStorage.getItem("stylo.catalog-preview.v1"))
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
  }, fixture);
  await page.goto("/vista-previa/gestion");
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  const editor = page.locator(".image-editor").first();
  const initialSrc = await editor.locator("img").getAttribute("src");
  const file = page.getByLabel("Archivo de reemplazo de imagen 1", {
    exact: true,
  });
  await file.setInputFiles({
    name: "invalid.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a valid image"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(editor.locator("img")).toHaveAttribute("src", initialSrc!);
  await file.setInputFiles("public/branding/logo-horizontal.webp");
  await expect(editor.locator("img")).not.toHaveAttribute("src", initialSrc!);
  await expect(page.locator(".image-editor")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  const images = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("stylo.catalog-preview.v1")!).catalog
        .products[0].images,
  );
  expect(images).toHaveLength(3);
  const original = fixture.catalog.products[0].images[0];
  expect(images[0]).toEqual({ ...original, path: expect.any(String) });
  expect(images[0].path).not.toBe(original.path);
  expect(images.slice(1)).toEqual(fixture.catalog.products[0].images.slice(1));
  await page.reload();
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  await expect(
    page.getByLabel("Descripción de imagen 1", { exact: true }),
  ).toHaveValue(original.alt);
  await expect(
    page.getByLabel("Imagen de", { exact: true }).first(),
  ).toHaveValue(original.variantId!);
  await expect(
    page.locator(".image-editor").first().locator("img"),
  ).not.toHaveAttribute("src", initialSrc!);
});

test("las fotos se cargan y reemplazan dentro de cada variante y conservan su asociación al guardar", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  const chocolate = page.locator(".variant-editor").first();
  const vanilla = page.locator(".variant-editor").nth(1);
  await chocolate
    .getByLabel("Subir fotos de variante 1", { exact: true })
    .setInputFiles("public/branding/logo-principal.webp");
  await chocolate
    .getByLabel("Descripción de imagen 1")
    .fill("Chocolate frontal");
  await vanilla
    .getByLabel("Subir fotos de variante 2", { exact: true })
    .setInputFiles("public/branding/logo-horizontal.webp");
  await vanilla.getByLabel("Descripción de imagen 2").fill("Vainilla frontal");
  await expect(chocolate.locator(".image-editor")).toHaveCount(1);
  await expect(vanilla.locator(".image-editor")).toHaveCount(1);
  await expect(page.locator("#editor-fotos .image-editor")).toHaveCount(0);
  const oldSrc = await chocolate
    .locator(".image-editor img")
    .getAttribute("src");
  const chooser = page.waitForEvent("filechooser");
  await chocolate
    .getByRole("button", { name: "Cambiar imagen 1", exact: true })
    .click();
  await (await chooser).setFiles("public/branding/logo-completo.webp");
  await expect(chocolate.locator(".image-editor img")).not.toHaveAttribute(
    "src",
    oldSrc!,
  );
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  await page.reload();
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  await expect(chocolate.getByLabel("Descripción de imagen 1")).toHaveValue(
    "Chocolate frontal",
  );
  await expect(vanilla.getByLabel("Descripción de imagen 2")).toHaveValue(
    "Vainilla frontal",
  );
  const ids = demoCatalog().products[0].variants.map((v) => v.id);
  await expect(chocolate.getByLabel("Imagen de", { exact: true })).toHaveValue(
    ids[0],
  );
  await expect(vanilla.getByLabel("Imagen de", { exact: true })).toHaveValue(
    ids[1],
  );
  await page.goto(
    "/vista-previa/producto/proteina-de-prueba?variante=" + ids[1],
  );
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Vainilla frontal",
  );
});

test("alta de marca y producto, ocultación y stock bajo", async ({ page }) => {
  await page.goto("/vista-previa/gestion");
  const menu = page
    .getByRole("navigation", { name: "Administración", exact: true })
    .locator("details");
  await expect(
    page.getByRole("button", { name: "Nuevo producto", exact: true }),
  ).toBeVisible();
  if (!(await menu.evaluate((el) => (el as HTMLDetailsElement).open)))
    await menu.locator("summary").click();
  await page
    .getByRole("navigation", { name: "Administración", exact: true })
    .getByRole("link", { name: "Marcas", exact: true })
    .click();
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
  await page
    .getByRole("navigation", { name: "Administración", exact: true })
    .getByRole("link", { name: "Productos", exact: true })
    .click();
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
  await page
    .getByRole("button", {
      name: "Editar Accesorio local de prueba",
      exact: true,
    })
    .click();
  await page.getByLabel("Visible en la tienda").uncheck();
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  // Hidden products stay available to the administrator for later editing.
  await expect(
    page.getByRole("button", {
      name: "Editar Accesorio local de prueba",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/vista-previa");
  await expect(page.locator(".product-card")).toHaveCount(4);
});

test("CSV previsualiza antes de aplicar y conserva variantes omitidas", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  const menu = page
    .getByRole("navigation", { name: "Administración", exact: true })
    .locator("details");
  await expect(
    page.getByRole("button", { name: "Nuevo producto", exact: true }),
  ).toBeVisible();
  if (!(await menu.evaluate((el) => (el as HTMLDetailsElement).open)))
    await menu.locator("summary").click();
  await page
    .getByRole("navigation", { name: "Administración", exact: true })
    .getByRole("link", { name: "Carga masiva", exact: true })
    .click();
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
  await expect(
    page.locator("#contenido .editorial-pricing-list"),
  ).toContainText("49.000");
  await expect(page.locator(".gainer-flavor-picker .variant-chip")).toHaveCount(
    2,
  );
});

test("Excel real se lee en el navegador y un lote duplicado queda bloqueado", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion");
  const menu = page
    .getByRole("navigation", { name: "Administración", exact: true })
    .locator("details");
  await expect(
    page.getByRole("button", { name: "Nuevo producto", exact: true }),
  ).toBeVisible();
  if (!(await menu.evaluate((el) => (el as HTMLDetailsElement).open)))
    await menu.locator("summary").click();
  await page
    .getByRole("navigation", { name: "Administración", exact: true })
    .getByRole("link", { name: "Carga masiva", exact: true })
    .click();
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

test("una categoría nueva requiere confirmación y se guarda con el lote", async ({
  page,
}) => {
  await page.goto("/vista-previa/gestion?seccion=import");
  const newRow = [...importRow];
  newRow[2] = "MARCA DE PRUEBA Á";
  newRow[3] = "Proteínas|Otros suplementos";
  await page.getByLabel("Archivo de catálogo").setInputFiles({
    name: "con-categoria.csv",
    mimeType: "text/csv",
    buffer: csv(newRow),
  });
  await expect(page.locator(".import-table")).toContainText(
    "Otros suplementos",
  );
  const apply = page.getByRole("button", { name: "Aplicar importación" });
  await expect(apply).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /Confirmo crear «Otros suplementos»/ })
    .check();
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("stylo.catalog-preview.v1") || "null"),
  );
  expect(
    stored.catalog.categories.some(
      (category: { slug: string }) => category.slug === "otros-suplementos",
    ),
  ).toBe(true);
  expect(
    stored.catalog.products.find(
      (product: { slug: string }) => product.slug === "proteina-de-prueba",
    ).categoryIds,
  ).toHaveLength(2);
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
    await chooseFilter(page, "categoria", "creatinas", false);
    await chooseFilter(page, "orden", "price-asc", false);
    await page.getByLabel("Buscá por producto o marca").fill("creatina");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
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
  await expect(page.locator(".product-card")).toHaveCount(1);
  const query = new URL(page.url()).searchParams;
  expect(Object.fromEntries(query)).toMatchObject({
    categoria: "proteinas",
    marca: "marca-de-prueba-a",
    sabor: "Chocolate",
    orden: "price-desc",
  });
  await closeMobileFilters(page);
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
  await expect(
    page.locator(".catalog-filters button[type=submit]"),
  ).toBeHidden();
  if (page.viewportSize()!.width < 960)
    await expect(
      page.getByRole("button", { name: "Ver productos", exact: true }),
    ).toBeVisible();
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
  await expect(page.getByLabel("Buscá por producto o marca")).toBeHidden();
  await panel.locator(":scope > summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Buscá por producto o marca")).toBeVisible();
  await expect(
    page.locator('input[name="categoria"][value="proteinas"]'),
  ).toBeChecked();
  await chooseFilter(page, "sabor", "Chocolate");
  await chooseFilter(page, "disponibilidad", "in-stock");
  await page.getByLabel("Desde (ARS)").fill("40000");
  await page.getByLabel("Hasta (ARS)").fill("46000");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("max"))
    .toBe("46000");
  await expect(page.locator(".product-card")).toHaveCount(1);
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toMatchObject({
    categoria: "proteinas",
    sabor: "Chocolate",
    disponibilidad: "in-stock",
    min: "40000",
    max: "46000",
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByLabel("Buscá por producto o marca")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("el giro automático cambia de variante y la ficha abre el sabor elegido sin miniaturas", async ({
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
  await expect(card.locator(".variant-spinner")).toHaveAttribute(
    "data-auto-playing",
    "true",
  );
  await page.clock.runFor(3100);
  await expect(
    card.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await expect(card.locator(".product-card-marker")).toHaveText("Vainilla");
  await expect(card.locator(".editorial-pricing-list")).toContainText("47.000");
  await expect(card.locator(".stock-badge")).toHaveText("Sin stock");
  await expect(
    card.getByRole("link", { name: "Ver variantes", exact: true }),
  ).toHaveAttribute("href", /variante=00000000-0000-4000-8000-000000000051$/);
  await expect(card.locator(".variant-spinner")).toHaveAttribute(
    "data-spinner-phase",
    "idle",
  );
  await expect(card.locator(".variant-spinner")).toHaveAttribute(
    "data-auto-playing",
    "true",
  );
  await page.clock.runFor(3100);
  await expect(
    card.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await card.getByRole("link", { name: "Ver variantes", exact: true }).click();
  await expect(page.locator(".product-thumbnails")).toHaveCount(0);
  await expect(
    page.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".gainer-flavor-picker")
    .getByRole("link", {
      name: "Vainilla · 1 kg · Envase · Sin stock",
      exact: true,
    })
    .click();
  await expect(
    page.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".editorial-pricing-list")).toContainText("47.000");
  await expect(page.locator(".gainer-flavor-picker")).toHaveAttribute(
    "data-selected-variant",
    demoCatalog().products[0].variants[1].id,
  );
});

test("buscador sin sugerencias aplica el último texto y permite limpiar sin perder foco", async ({
  page,
}) => {
  await page.goto("/vista-previa");
  await openFilters(page);
  const search = page.getByLabel("Buscá por producto o marca");
  await expect(search).not.toHaveAttribute("list");
  await expect(page.locator("datalist")).toHaveCount(0);
  await expect(
    page.locator(".catalog-filters button[type=submit]"),
  ).toBeHidden();
  await search.fill("creatina");
  await search.fill("proteina");
  await expect(page).toHaveURL(/q=proteina/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("proteina");
  await chooseFilter(page, "sabor", "Vainilla");
  await expect(page.locator(".product-card .stock-badge")).toHaveText(
    "Sin stock",
  );
  await page
    .getByRole("link", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page.locator(".product-card")).toHaveCount(4);
  await openFilters(page);
  await expect(search).toHaveValue("");
  await expect(page.locator('input[name="sabor"][value=""]')).toBeChecked();
});

test("limpiar cancela una búsqueda pendiente sin volver a aplicar el texto", async ({
  page,
}) => {
  await page.goto("/vista-previa?q=proteina");
  await openFilters(page);
  await page.clock.install();
  await page.getByLabel("Buscá por producto o marca").fill("creatina");
  await page.getByRole("link", { name: "Limpiar filtros" }).click();
  await expect(page.locator(".product-card")).toHaveCount(4);
  await page.clock.runFor(1000);
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
  await openFilters(page);
  await expect(page.getByLabel("Buscá por producto o marca")).toHaveValue("");
});

test("los filtros siguen visibles al desplazar el catálogo y sus opciones largas son accesibles", async ({
  page,
}) => {
  await page.goto("/vista-previa");
  const sidebar = page.locator(".catalog-sidebar");
  const layout = await page.locator(".catalog-layout").boundingBox();
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    layout!.y + 220,
  );
  const desktop = (await page.viewportSize())!.width >= 960;
  await expect
    .poll(async () => (await sidebar.boundingBox())!.y)
    .toBe(desktop ? 24 : 12);
  await openFilters(page);
  const group = page.locator(".catalog-filter-group").first();
  await group.locator("summary").click();
  await page
    .locator('input[name="categoria"][value="barras-y-snacks"]')
    .scrollIntoViewIfNeeded();
  await expect(
    page.locator('input[name="categoria"][value="barras-y-snacks"]'),
  ).toBeInViewport();
  expect((await sidebar.boundingBox())!.height).toBeLessThanOrEqual(
    (await page.viewportSize())!.height - (desktop ? 48 : 24),
  );
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
  const gallery = page.locator(".variant-spinner");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(3100);
  await expect(
    page.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await expect(gallery).toHaveAttribute("data-spinner-phase", "idle");
  await gallery.locator(".product-frame-link").focus();
  await expect(gallery).not.toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(11000);
  await expect(
    page.getByAltText("Vainilla frente", { exact: true }),
  ).toBeVisible();
  await gallery
    .locator(".product-frame-link")
    .evaluate((element) => element.blur());
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  await page.clock.runFor(3100);
  await expect(
    page.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(gallery).not.toHaveAttribute("data-auto-playing", "true");
  await expect(gallery).toHaveAttribute("data-spinner-phase", "idle");
  await page.clock.runFor(11000);
  await expect(
    page.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await expect(gallery.getByRole("button")).toHaveCount(2);
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
  await expect(card.locator(".product-card-marker")).toContainText("Vainilla");
  await expect(card.locator(".editorial-pricing-list")).toContainText("47.000");
  await expect(card.locator(".stock-badge")).toHaveText("Sin stock");
  await card.getByRole("link", { name: "Ver variantes", exact: true }).click();
  await expect(page.locator(".gainer-flavor-picker")).toHaveAttribute(
    "data-selected-variant",
    demoCatalog().products[0].variants[1].id,
  );

  await page.goto("/vista-previa?q=proteina&sabor=Chocolate");
  await expect(
    card.getByRole("img", { name: "Chocolate frente", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Siguiente imagen", exact: true }),
  ).toHaveCount(0);
  await page.clock.runFor(11000);
  await expect(card.locator(".product-card-marker")).toContainText("Chocolate");

  await page.goto(
    "/vista-previa?q=proteina&min=46000&max=48000&disponibilidad=out-of-stock",
  );
  await expect(
    card.getByRole("img", { name: "Vainilla frente", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Siguiente imagen", exact: true }),
  ).toHaveCount(0);
  await expect(card.locator(".editorial-pricing-list")).toContainText("47.000");
});

test("el giro automático conserva el tamaño, evita fragmentos y se cancela con movimiento reducido", async ({
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
  const gallery = page.locator(".variant-spinner");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute("data-auto-playing", "true");
  const before = await gallery.evaluate((e) => [e.clientWidth, e.clientHeight]);
  await page.clock.runFor(2900);
  await expect(
    page.getByAltText("Chocolate frente", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(200);
  await expect(gallery).toHaveAttribute("data-spinner-phase", "outgoing");
  await expect(gallery.locator(".product-image-fragments")).toHaveCount(0);
  expect(
    await gallery.evaluate((e) => [e.clientWidth, e.clientHeight]),
  ).toEqual(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(gallery).toHaveAttribute("data-spinner-phase", "idle");
  await expect(gallery.locator(".variant-spinner-frame")).toHaveCount(1);
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
