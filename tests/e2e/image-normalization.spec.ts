import { test, expect } from "@playwright/test";

test("piloto de cinco productos: encuadre cuadrado, alineación y responsive sin afectar originales", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/imagenes");
  await expect(page.locator(".product-card")).toHaveCount(5);
  await expect(page.locator('[data-normalized="true"]')).toHaveCount(5);
  for (const width of [1600, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    const layout = await page.locator(".product-card").evaluateAll((cards) =>
      cards.map((card) => {
        const c = card.getBoundingClientRect(),
          stage = card
            .querySelector(".product-image-stage")!
            .getBoundingClientRect();
        return {
          height: c.height,
          width: stage.width,
          stageHeight: stage.height,
          priceTop:
            card.querySelector(".editorial-pricing")!.getBoundingClientRect().top -
            c.top,
        };
      }),
    );
    expect(
      layout.every((item) => Math.abs(item.width - item.stageHeight) < 1),
    ).toBe(true);
    expect(
      Math.max(...layout.map((item) => item.height)) -
        Math.min(...layout.map((item) => item.height)),
    ).toBeLessThan(1);
    expect(
      Math.max(...layout.map((item) => item.priceTop)) -
        Math.min(...layout.map((item) => item.priceTop)),
    ).toBeLessThan(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 960)
      expect(
        await page
          .locator(".image-trial-grid")
          .evaluate(
            (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
          ),
      ).toBe(2);
  }
  const images = page.locator(".product-frame-current");
  await expect(images.first()).toHaveAttribute("loading", "eager");
  await expect(images.nth(2)).toHaveAttribute("loading", "lazy");
  await expect(images.first()).toHaveAttribute("srcset", /320w.*640w.*1000w/);
  await expect(images.first()).toHaveAttribute("sizes", /50vw/);
  await page
    .getByRole("link", { name: "Antes · Originales", exact: true })
    .click();
  await expect(page.locator('[data-normalized="true"]')).toHaveCount(0);
  await expect(page.locator(".product-frame-current").first()).toHaveAttribute(
    "src",
    /normalization-trial-v1\/before\//,
  );
  expect(errors).toEqual([]);
});

test("detalle del piloto conserva variantes normalizadas y comparador sin miniaturas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/vista-previa/imagenes/producto/star-nutrition-proteina-whey-protein-x-2-lbs-dp",
  );
  const gallery = page.locator(".product-image-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute("data-normalized", "true");
  await gallery
    .locator(".product-frame-current")
    .evaluate((img: HTMLImageElement) => img.decode());
  const before = await page
    .locator(".gainer-flavor-picker")
    .getAttribute("data-selected-variant");
  const background = await gallery
    .locator(".product-image-stage")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  // The normalization comparator deliberately retains its independent rock.
  expect(background).toContain("rock-square-v1.webp");
  await gallery
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator(".gainer-flavor-picker")).not.toHaveAttribute(
    "data-selected-variant",
    before!,
  );
  await expect(gallery).toHaveAttribute("data-normalized", "true");
  expect(
    await gallery
      .locator(".product-image-stage")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toBe(background);
  await expect(gallery.locator(".product-thumbnail-rail")).toHaveCount(0);
  await page.goto("/vista-previa?q=proteina");
  await expect(page.locator('[data-normalized="true"]')).toHaveCount(0);
});

test("las imágenes del piloto y sus originales permanecen accesibles sin JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/vista-previa/imagenes`);
  await expect(page.locator(".product-card")).toHaveCount(5);
  await expect(page.locator(".product-frame-current").first()).toHaveAttribute(
    "srcset",
    /1000w/,
  );
  await page
    .getByRole("link", { name: "Antes · Originales", exact: true })
    .click();
  await expect(page).toHaveURL(/originales=1/);
  await expect(page.locator('[data-normalized="true"]')).toHaveCount(0);
  await context.close();
});
