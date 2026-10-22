import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("la cabecera comparte medidas y tipografía entre portada y páginas interiores", async ({
  page,
}) => {
  const routes = [
    "/vista-previa/portada",
    "/vista-previa",
    "/vista-previa/producto/proteina-de-prueba",
    "/carrito",
    "/buscar",
    "/contacto",
  ];
  let reference: unknown;
  for (const route of routes) {
    await page.goto(route);
    const header = page.locator(".site-header");
    await expect(header).toBeVisible();
    const metrics = await header.evaluate((node) => {
      const css = (selector: string) =>
        getComputedStyle(node.querySelector(selector)!);
      return {
        height: node.getBoundingClientRect().height,
        position: getComputedStyle(node).position,
        font: getComputedStyle(node).fontFamily,
        logo: css(".brand-official").width,
        lion: css(".brand-isotype").width,
        gap: css(".header-actions").gap,
        search: css(".reference-search-trigger").width,
        bag: css(".cart-trigger").width,
        nav: [
          css(".desktop-nav").fontSize,
          css(".desktop-nav").fontWeight,
          css(".desktop-nav").letterSpacing,
        ],
      };
    });
    reference ??= metrics;
    expect(metrics, route).toEqual(reference);
  }
});

test("logo y tres acciones mantienen alineación y áreas táctiles a 320, 375, 390 y 430px", async ({
  page,
}, info) => {
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/vista-previa/portada");
    const header = page.locator(".site-header");
    const logo = await header.locator(".brand-link").boundingBox();
    const controls = await Promise.all(
      [".reference-search-trigger", ".cart-trigger", ".menu-toggle"].map(
        (selector) => header.locator(selector).boundingBox(),
      ),
    );
    expect(logo!.x + logo!.width).toBeLessThan(controls[0]!.x);
    for (const rect of controls) {
      expect(rect!.width).toBe(44);
      expect(rect!.height).toBe(44);
      expect(rect!.y).toBe(controls[0]!.y);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    }
    expect(controls[1]!.x - controls[0]!.x - 44).toBe(8);
    expect(controls[2]!.x - controls[1]!.x - 44).toBe(8);
    await header.getByLabel("Menú de navegación").click();
    await expect(
      header.getByRole("navigation", { name: "Navegación móvil" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    if (width === 390)
      await page.screenshot({ path: info.outputPath("header-390.png") });
  }
});

test("el vuelo llega a una bolsa visible aunque el encabezado esté fuera de pantalla o falte el icono", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vista-previa/portada");
  const button = page
    .locator("#tu-combo")
    .getByRole("button", { name: "Agregar combo a la bolsa" });
  await button.scrollIntoViewIfNeeded();
  expect((await page.locator(".cart-trigger").boundingBox())!.y).toBeLessThan(
    0,
  );
  await button.click();
  await expect(page.locator(".cart-fly-dot")).toHaveCount(1);
  await expect(page.locator(".cart-flight-destination")).toBeVisible();
  await page.evaluate(() => scrollBy(0, 60));
  const destination = await page
    .locator(".cart-flight-destination")
    .boundingBox();
  expect(destination!.y).toBeGreaterThanOrEqual(0);
  await expect(page.locator(".cart-fly-dot")).toHaveCount(0);
  await expect(page.locator(".cart-flight-destination")).toHaveCount(0);
  await page.locator(".cart-trigger").evaluate((node) => {
    (node as HTMLElement).style.display = "none";
  });
  await button.click();
  await expect(page.locator(".cart-fly-dot")).toHaveCount(1);
  await expect(page.locator(".cart-flight-destination")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".cart-fly-dot")).toHaveCount(0);
  await expect(page.locator(".cart-flight-destination")).toHaveCount(0);
  await expect(page.locator(".cart-arrival")).toContainText(
    "Agregado a tu bolsa",
  );
  expect(errors).toEqual([]);
});

test("los números reales cuentan al entrar y el carrusel conserva un loop de dos mitades idénticas", async ({
  page,
}, info) => {
  await page.goto("/vista-previa/portada");
  const why = page.locator(".home-why-stylo");
  await expect(why).toHaveAttribute("data-counting", "pending");
  await why.scrollIntoViewIfNeeded();
  await expect(why).toHaveAttribute("data-counting", "running");
  await expect(why).toHaveAttribute("data-counting", "done");
  await expect(why.locator("[data-stat-number]").first()).toHaveText(
    String(demoCatalog().products.length),
  );
  await why.screenshot({ path: info.outputPath("why-stylo.png") });
  const brands = page.locator(".brand-marquee");
  await brands.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(brands).toHaveAttribute("data-running", "true");
  const widths = await brands
    .locator(".brand-marquee-group")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().width),
    );
  expect(widths[0]).toBeCloseTo(widths[1], 2);
  const seam = await brands
    .locator(".brand-marquee-track")
    .evaluate((track) => {
      const animation = track.getAnimations()[0];
      const duration = Number(animation.effect!.getTiming().duration);
      animation.pause();
      animation.currentTime = 0;
      const start = track.children[0].getBoundingClientRect().left;
      animation.currentTime = duration - 1;
      const end = track.children[1].getBoundingClientRect().left;
      return Math.abs(start - end);
    });
  expect(seam).toBeLessThan(1);
  await brands.screenshot({ path: info.outputPath("brands-loop.png") });
  await brands.getByRole("button", { name: "Pausar marcas" }).click();
  await expect(brands).toHaveAttribute("data-paused", "true");
  await why.scrollIntoViewIfNeeded();
  await expect(why).toHaveAttribute("data-counting", "done");
});

test("la postulación de ejemplo valida sin enviar ni guardar información", async ({
  page,
}, info) => {
  await page.goto("/vista-previa/portada");
  const athlete = page.locator("#atletas");
  await athlete.scrollIntoViewIfNeeded();
  await expect
    .poll(
      () =>
        athlete
          .locator(".home-athlete-photo img")
          .evaluateAll((images) =>
            images.every(
              (img) =>
                (img as HTMLImageElement).complete &&
                (img as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      { timeout: 15000 },
    )
    .toBe(true);
  await expect(athlete).toContainText("Beneficios de ejemplo");
  await athlete.getByLabel("Nombre y apellido").fill("Atleta de prueba");
  await athlete.getByLabel("Instagram", { exact: true }).fill("@prueba");
  await athlete.getByLabel("Disciplina", { exact: true }).fill("Atletismo");
  await athlete.getByLabel("Email", { exact: true }).fill("prueba@example.com");
  await athlete.screenshot({ path: info.outputPath("athlete-example.png") });
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") submissions.push(request.url());
  });
  await athlete.getByRole("button", { name: "Quiero ser parte" }).click();
  await expect(athlete.getByRole("status")).toContainText(
    "Tu postulación no fue enviada",
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
  expect(submissions).toEqual([]);
});

test("movimiento reducido mantiene números y marcas sin animar; sin JS no expone el formulario de ejemplo", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/portada");
  await expect(page.locator(".home-why-stylo")).toHaveAttribute(
    "data-counting",
    "done",
  );
  await expect(page.locator(".brand-marquee")).toHaveAttribute(
    "data-enhanced",
    "false",
  );
  await expect(
    page.locator('.brand-marquee-group[aria-hidden="true"]'),
  ).not.toBeVisible();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJS = await context.newPage();
  await noJS.goto(`${baseURL}/`);
  await expect(
    noJS.getByRole("heading", { name: "Por qué STYLO" }),
  ).toBeVisible();
  await expect(noJS.locator(".home-athlete-form")).not.toBeVisible();
  await expect(noJS.locator("#atletas")).toContainText("requiere JavaScript");
  await context.close();
});
