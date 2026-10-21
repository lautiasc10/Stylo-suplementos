import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Let server HTML and fonts paint while hydration is delayed, as on a slow
// phone. Ordinary fast navigations can hide these shifts before first paint.
async function delayHydration(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}

async function paintedHtml(page: Page) {
  // fonts.ready may resolve before a delayed stylesheet is even parsed.
  // A pre-paint DOM measurement would include the browser's default margins,
  // not a layout that the visitor could have seen.
  await page.waitForFunction(
    () => performance.getEntriesByName("first-contentful-paint").length > 0,
  );
  await page.evaluate(() => document.fonts.ready);
}

test("los filtros móviles no desplazan los resultados cuando llega JavaScript", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.setViewportSize({ width: 390, height: 844 });
  const release = await delayHydration(page);
  let before = 0;
  try {
    await page.goto("/catalogo", { waitUntil: "commit" });
    await expect(page.locator(".catalog-results")).toBeVisible();
    await paintedHtml(page);
    before = (await page.locator(".catalog-results").boundingBox())!.y;
  } finally {
    release();
  }
  await expect(page.locator(".catalog-filter-panel")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await expect(page.locator(".catalog-filter-panel")).toHaveJSProperty(
    "open",
    false,
  );
  const after = (await page.locator(".catalog-results").boundingBox())!.y;
  expect(Math.abs(after - before)).toBeLessThan(1);
  await page.locator(".catalog-panel-toggle").click();
  await expect(
    page.getByRole("dialog", { name: "Filtrar y ordenar", exact: true }),
  ).toBeVisible();
});

test("la capa de legibilidad conserva su caja al hidratar la ficha", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const release = await delayHydration(page);
  await page.route(/\/_next\/static\/.*\.css(?:\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  const veil = page.locator(".flavor-hero-readability");
  let before!: NonNullable<Awaited<ReturnType<typeof veil.boundingBox>>>;
  try {
    await page.goto(
      "/vista-previa/imagenes/producto/star-nutrition-proteina-whey-protein-x-2-lbs-dp",
      { waitUntil: "commit" },
    );
    await expect(veil).toBeAttached();
    await paintedHtml(page);
    before = (await veil.boundingBox())!;
  } finally {
    release();
  }
  await expect(page.locator(".product-detail")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  const after = (await veil.boundingBox())!;
  for (const dimension of ["x", "y", "width", "height"] as const)
    expect(
      Math.abs(after[dimension] - before[dimension]),
      dimension,
    ).toBeLessThan(1);
});

test("hidratar conserva los filtros que el usuario ya abrió sin JavaScript", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.setViewportSize({ width: 390, height: 844 });
  const release = await delayHydration(page);
  try {
    await page.goto("/catalogo", { waitUntil: "commit" });
    await page.locator(".catalog-panel-toggle").click();
    await page.getByLabel("Buscá por producto o marca").fill("creatina");
  } finally {
    release();
  }
  await expect(page.locator(".catalog-filter-panel")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  const modal = page.getByRole("dialog", {
    name: "Filtrar y ordenar",
    exact: true,
  });
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel("Buscá por producto o marca")).toHaveValue(
    "creatina",
  );
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("solo los derivados versionados tienen caché inmutable", async ({
  request,
}) => {
  const trial = JSON.parse(
    readFileSync("src/modules/catalog/normalization-trial.json", "utf8"),
  ) as {
    normalizedUrls: Record<string, string>;
  };
  for (const asset of [
    "/sabores/frutilla-decor-v1.webp",
    "/sabores/mobile/frutilla-decor-v1.webp",
    Object.values(trial.normalizedUrls)[0],
  ]) {
    const response = await request.head(asset);
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toContain(
      "max-age=31536000, immutable",
    );
  }
  const original = await request.head("/sabores/frutilla.png");
  expect(original.headers()["cache-control"]).not.toContain("immutable");
  const report = await request.head(
    "/media/products-normalized-v1/report.json",
  );
  expect(report.headers()["cache-control"]).not.toContain("immutable");
});

test("las precargas vecinas esperan al fondo visible sin bloquear una elección", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const neighbors: string[] = [];
  page.on("request", (request) => {
    if (
      /\/sabores\/mobile\/.+-decor-v1\.webp/.test(request.url()) &&
      !request.url().includes("/chocolate-")
    )
      neighbors.push(request.url());
  });
  await page.route(
    "**/sabores/mobile/chocolate-decor-v1.webp",
    async (route) => {
      await gate;
      await route.continue();
    },
  );
  try {
    await page.goto("/vista-previa/producto/proteina-de-prueba", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.locator(".flavor-scene-piece img").first(),
    ).toHaveAttribute("fetchpriority", "high");
    // Beyond the old 120ms idle timer, but the current decoration is still held.
    await page.waitForTimeout(400);
    expect(neighbors).toEqual([]);
    // An explicit choice remains immediate even while current media is slow.
    await page
      .getByRole("button", { name: "Sabor siguiente", exact: true })
      .click();
    await expect(page.locator(".product-detail")).toHaveAttribute(
      "data-flavor",
      "vainilla",
    );
  } finally {
    release();
  }
});
