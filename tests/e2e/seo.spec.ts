import { expect, test } from "@playwright/test";

test("metadatos públicos específicos, canonical sin filtros y bloqueo de indexación", async ({
  page,
  baseURL,
}) => {
  for (const [path, canonical, title] of [
    ["/", "/", "STYLO Suplementos | Potenciá tu mejor versión"],
    [
      "/catalogo?categoria=proteinas&orden=price-asc",
      "/catalogo",
      "Tienda | STYLO Suplementos",
    ],
    ["/nosotros", "/nosotros", "Sobre STYLO | STYLO Suplementos"],
    ["/contacto", "/contacto", "Contacto | STYLO Suplementos"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /\S.{35,}/,
    );
    // Next normalizes an origin-only canonical without its trailing slash.
    for (const [selector, attribute] of [
      ["link[rel=canonical]", "href"],
      ['meta[property="og:url"]', "content"],
    ]) {
      const element = page.locator(selector);
      await expect(element).toHaveAttribute(attribute, /^https?:\/\//);
      expect(
        new URL((await element.getAttribute(attribute))!, baseURL).href,
      ).toBe(new URL(canonical, baseURL).href);
    }
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute(
      "content",
      (await page
        .locator('meta[name="description"]')
        .getAttribute("content")) ?? "",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex, nofollow/,
    );
  }
});

test("el sitemap solo contiene rutas públicas y robots sigue bloqueando el sitio", async ({
  request,
  baseURL,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(sitemap.headers()["content-type"]).toMatch(/xml/);
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  // Without Supabase, preview fixture products must not appear in the sitemap.
  expect(urls).toEqual(
    ["/", "/catalogo", "/nosotros", "/contacto"].map(
      (path) => new URL(path, baseURL).href,
    ),
  );
  expect(xml).not.toMatch(
    /lastmod|vista-previa|admin|checkout|carrito|buscar|variante=/,
  );
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
  expect(await robots.text()).not.toContain("Sitemap:");
});

test("el HTML sin JavaScript conserva metadatos y las rutas privadas no publican productos", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    userAgent: "Googlebot",
    baseURL,
  });
  try {
    const page = await context.newPage();
    await page.goto("/nosotros");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Rosario/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new URL("/nosotros", baseURL).href,
    );
    for (const path of [
      "/buscar?q=proteina",
      "/carrito",
      "/checkout",
      "/vista-previa",
    ]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
      await expect(
        page.locator('script[type="application/ld+json"]'),
      ).toHaveCount(0);
    }
    const missing = await page.goto("/producto/no-existe-en-catalogo");
    expect(missing?.status()).toBe(404);
    await expect(
      page.locator('script[type="application/ld+json"]'),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
