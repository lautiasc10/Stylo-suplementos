import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("Novedades se controla desde el editor sin alterar SKU ni precios", async ({ page }) => {
  await page.goto("/vista-previa/gestion");
  await page.getByRole("button", { name: "Editar Proteína de prueba", exact: true }).click();
  const before = demoCatalog().products[0].variants;
  await page.getByLabel("Mostrar en Novedades", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar producto", exact: true }).click();
  await page.getByRole("button", { name: "Editar Proteína de prueba", exact: true }).click();
  await expect(page.getByLabel("Mostrar en Novedades", { exact: true })).toBeChecked();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("stylo.catalog-preview.v1")!).catalog.products[0]);
  expect(saved.tags).toContain("novedad");
  expect(saved.variants).toEqual(before);
});

test("Contacto ofrece los canales oficiales y conserva el ancho sin publicar domicilio u horarios", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of info.project.name === "desktop"
    ? [1440, 768]
    : [375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/contacto");
    await expect(
      page.getByRole("heading", { name: "Conectá con STYLO." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Escribinos por WhatsApp/ }),
    ).toHaveAttribute("href", "https://wa.me/5493415316456");
    for (const [channel, href] of [
      ["Email", "mailto:stylo.suplementos@gmail.com"],
      ["Instagram", "https://www.instagram.com/stylo.suplementos/"],
      ["Facebook", "https://www.facebook.com/Stylo.Suplementos/"],
    ])
      await expect(
        page
          .locator(".contact-stylo-channel")
          .filter({
            has: page.getByRole("heading", { name: channel, exact: true }),
          }),
      ).toHaveAttribute("href", href);
    await expect(page.locator("main")).not.toContainText("Pronto, nuestros");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBe(false);
    await page.screenshot({
      path: info.outputPath(`contact-${width}.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("una consulta local llega a la bandeja, se filtra y permite seguimiento privado", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST")
      writes.push(new URL(request.url()).pathname);
  });
  await page.goto("/vista-previa/portada#atletas");
  const form = page.locator(".home-team-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Consulto como").selectOption("teacher");
  await form.getByLabel("Nombre y apellido").fill("Profesora de prueba");
  await form.getByLabel("Email", { exact: true }).fill("profe@example.com");
  await form
    .getByLabel("Disciplina o actividad")
    .fill("Entrenamiento funcional");
  await form
    .getByLabel(/Contanos sobre vos/)
    .fill("Me interesa conversar sobre una colaboración.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Enviar consulta al Team" }).click();
  await expect(page.locator(".home-team-confirmation")).toContainText(
    "no se envió a STYLO",
  );
  await page
    .getByRole("link", { name: "Ver consulta en el panel de prueba" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Atletas y profesores", exact: true }),
  ).toBeVisible();
  const entry = page
    .locator(".team-inbox-item")
    .filter({ hasText: "Profesora de prueba" });
  await expect(entry).toBeVisible();
  await entry.locator("summary").click();
  await expect(entry).toContainText("profe@example.com");
  await entry
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("contacted");
  await entry
    .getByLabel("Notas internas")
    .fill("Seguimiento ficticio, sin enviar mensajes.");
  await entry.getByRole("button", { name: "Guardar seguimiento" }).click();
  await expect(entry.locator(".team-inbox-state")).toHaveText("Contactada");
  await page.reload();
  await expect(entry.locator(".team-inbox-state")).toHaveText("Contactada");
  await page.getByLabel("Filtrar por estado").selectOption("new");
  await expect(
    page.getByRole("heading", { name: "No hay coincidencias" }),
  ).toBeVisible();
  await page.getByLabel("Filtrar por estado").selectOption("");
  await page.getByLabel("Buscar nombre o email").fill("profe@example.com");
  await expect(entry).toBeVisible();
  expect(page.url()).not.toContain("example.com");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath("team-inbox.png"),
    fullPage: true,
  });
  expect(writes).toEqual([]);
});

test("Contacto y las consultas del Team mantienen contenido sin JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/contacto`);
  await expect(
    page.getByRole("link", { name: /Escribinos por WhatsApp/ }),
  ).toHaveAttribute("href", "https://wa.me/5493415316456");
  await page.goto(`${baseURL}/#atletas`);
  await expect(page.locator("#atletas")).toContainText(
    "No te suscribe a publicidad",
  );
  await expect(page.locator(".home-team-form button")).toBeDisabled();
  await context.close();
});
