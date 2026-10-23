import { expect, test } from "@playwright/test";
import sharp from "sharp";

const photo =
  "public/media/catalog-normalized-v2/xbody-creatina-1kg-20261023-a46e9dae386b-v1-1000.webp";

test("la carga automática conserva escala y variantes, y rechaza fondos opacos sin reemplazar", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [],
    externalWrites: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/supabase/.test(request.url()) && request.method() !== "GET")
      externalWrites.push(request.url());
  });
  await page.goto("/vista-previa/gestion");
  await page
    .getByRole("button", { name: "Editar Proteína de prueba", exact: true })
    .click();
  await page
    .getByLabel("Subir fotos de variante 1", { exact: true })
    .setInputFiles(photo);
  const editor = page
    .locator(".variant-editor")
    .first()
    .locator(".image-editor")
    .first();
  await expect(editor.locator("img")).toHaveAttribute(
    "src",
    /^data:image\/webp;base64,/,
    { timeout: 20000 },
  );
  const before = await editor.locator("img").getAttribute("src");
  const dimensions = await editor
    .locator("img")
    .evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1000;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const bytes = ctx.getImageData(0, 0, 1000, 1000).data;
      let top = 1000,
        bottom = 0;
      for (let y = 0; y < 1000; y++)
        for (let x = 0; x < 1000; x++)
          if (bytes[(y * 1000 + x) * 4 + 3] >= 32) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y + 1);
          }
      return [img.naturalWidth, img.naturalHeight, top, bottom];
    });
  expect(dimensions).toEqual([1000, 1000, 100, 900]);
  await page
    .locator(".variant-editor")
    .first()
    .screenshot({ path: test.info().outputPath("upload-preview.png") });
  const opaque = await sharp({
    create: { width: 700, height: 900, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Archivo de reemplazo de imagen 1", { exact: true })
    .setInputFiles({
      name: "con-fondo.png",
      mimeType: "image/png",
      buffer: opaque,
    });
  await expect(page.locator(".catalog-editor .form-message")).toContainText(
    "transparente",
  );
  await expect(editor.locator("img")).toHaveAttribute("src", before!);
  await page
    .getByLabel("Subir fichas informativas", { exact: true })
    .setInputFiles({
      name: "ficha.png",
      mimeType: "image/png",
      buffer: opaque,
    });
  await expect(page.locator("#editor-fichas .image-editor")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados.");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("stylo.catalog-preview.v1")!),
  );
  expect(stored.catalog.products[0].images[0].path).toMatch(
    /-normalized-v1-webp-1000\.webp$/,
  );
  expect(stored.catalog.products[0].informationImages[0].path).toMatch(
    /-information-v1-png\.webp$/,
  );
  await page.goto("/vista-previa?q=proteina");
  await expect(
    page.locator('.product-card [data-normalized="true"]'),
  ).toBeVisible();
  await page.locator(".product-card .product-frame-link").first().click();
  await expect(page).toHaveURL(/\/vista-previa\/producto\/proteina-de-prueba/);
  await expect(
    page.locator('.product-image-gallery[data-normalized="true"]'),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("normalized-detail.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(externalWrites).toEqual([]);
});
