import { test, expect } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

test("una búsqueda larga se revela al entrar la primera fila, sin esperar el 20% de toda la grilla", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.setViewportSize({ width: 375, height: 844 });
  const catalog = demoCatalog();
  const product = catalog.products[1];
  catalog.products = Array.from({ length: 10 }, (_, index) => ({
    ...product,
    id: `00000000-0000-4000-8000-${String(500 + index).padStart(12, "0")}`,
    name: `Creatina de prueba ${index + 1}`,
    slug: `creatina-de-prueba-${index + 1}`,
    variants: product.variants.slice(0, 1).map((variant) => ({
      ...variant,
      id: `00000000-0000-4000-8000-${String(700 + index).padStart(12, "0")}`,
      sku: `TEST-CREATINA-${index + 1}`,
    })),
  }));
  await page.addInitScript((catalog) => {
    localStorage.setItem(
      "stylo.catalog-preview.v1",
      JSON.stringify({ catalog, images: {} }),
    );
  }, catalog);
  await page.goto("/vista-previa/buscar?q=creatina");
  const grid = page.locator(".search-product-grid");
  await expect(grid.locator(".product-card")).toHaveCount(10);
  // Preview-only notices add height above the results. Expose just the first
  // 280px of a five-row grid; its total visible ratio is well below 20%.
  await grid.evaluate((el) =>
    scrollTo({
      top: scrollY + el.getBoundingClientRect().top - innerHeight + 280,
      behavior: "instant",
    }),
  );
  const position = await page.evaluate(() => scrollY);
  await expect(grid).toHaveAttribute("data-reveal", "visible");
  await expect(grid.locator(".ui-reveal-item").first()).toHaveCSS(
    "opacity",
    "1",
  );
  expect(await page.evaluate(() => scrollY)).toBe(position);
});

test("los fondos de sabor móviles usan solo sus copias compactas, incluidas las precargas vecinas", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.setViewportSize({ width: 375, height: 844 });
  const originalRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/sabores\/[^/]+-decor-v1\.webp/.test(request.url()))
      originalRequests.push(request.url());
  });
  await page.goto("/vista-previa/producto/proteina-de-prueba");
  const image = page.locator(".flavor-scene-piece img").first();
  await expect(image).toBeVisible();
  const current = await image.evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    return image.currentSrc;
  });
  expect(current).toContain("/sabores/mobile/chocolate-decor-v1.webp");
  expect(originalRequests).toEqual([]);
});

for (const width of [375, 768]) {
  test(`filtros móviles a ${width}px: foco, scroll bloqueado, cierre y selección persistente`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "mobile");
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/vista-previa");
    const toggle = page.locator(".catalog-panel-toggle");
    await toggle.click();
    const modal = page.getByRole("dialog", {
      name: "Filtrar y ordenar",
      exact: true,
    });
    await expect(modal).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");
    const close = modal.getByRole("button", {
      name: "Cerrar filtros",
      exact: true,
    });
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      modal.getByRole("button", { name: "Ver productos", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await modal.locator(".catalog-filter-group summary").first().click();
    await modal.locator('input[name="categoria"][value="proteinas"]').check();
    await expect(page).toHaveURL(/categoria=proteinas/);
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[name="q"]')).toHaveCSS(
      "font-size",
      "16px",
    );
    await modal
      .getByRole("button", { name: "Ver productos", exact: true })
      .click();
    await expect(modal).not.toBeVisible();
    await expect(toggle).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");
    expect(
      (await page.locator(".catalog-sidebar").boundingBox())!.height,
    ).toBeLessThanOrEqual(60);
    await toggle.click();
    await expect(
      modal.locator('input[name="categoria"][value="proteinas"]'),
    ).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
    await toggle.click();
    await expect(modal).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(modal).not.toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("las etiquetas largas, la promoción y el stock quedan dentro de las tarjetas sin superponerse", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.setViewportSize({ width: 375, height: 844 });
  const catalog = demoCatalog();
  catalog.products = catalog.products.slice(0, 2).map((product, index) => ({
    ...product,
    name: index === 0 ? "A · Promoción de prueba" : "B · Agotado de prueba",
    images: [],
    variants: (index === 0
      ? product.variants.slice(0, 2)
      : product.variants.slice(0, 1)
    ).map((variant) => ({
      ...variant,
      flavor: index === 0 ? "Cookies & cream" : "Chocolate suizo",
      stock: index === 0 ? 8 : 0,
    })),
  }));
  const promotions = [
    {
      id: "00000000-0000-4000-8000-000000000902",
      name: "Cantidad de prueba",
      kind: "quantity",
      active: true,
      components: [
        { variantId: catalog.products[0].variants[0].id, quantity: 3 },
      ],
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
  await expect(page.locator(".product-promotion-tag")).toBeVisible();
  await expect(page.locator('.stock-badge[data-stock="empty"]')).toBeVisible();
  const layouts = await page.locator(".product-card").evaluateAll((cards) =>
    cards.map((card) => {
      const media = card
        .querySelector(".product-card-media")!
        .getBoundingClientRect();
      const labels = [
        ...card.querySelectorAll<HTMLElement>(".product-card-labels > *"),
      ].map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom,
          clipped: element.scrollWidth > element.clientWidth + 1,
        };
      });
      return {
        inside: labels.every(
          (label) =>
            label.left >= media.left &&
            label.right <= media.right &&
            label.top >= media.top &&
            label.bottom <= media.bottom &&
            !label.clipped,
        ),
        overlaps: labels.some((a, i) =>
          labels.some(
            (b, j) =>
              i !== j &&
              Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
          ),
        ),
        coversControl: labels.some((a) =>
          [...card.querySelectorAll(".variant-navigation button")].some(
            (element) => {
              const b = element.getBoundingClientRect();
              return (
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
              );
            },
          ),
        ),
      };
    }),
  );
  expect(
    layouts.every(
      (layout) => layout.inside && !layout.overlaps && !layout.coversControl,
    ),
  ).toBe(true);
  await expect(page.locator(".product-placeholder").first()).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  for (const marker of await page.locator(".product-card-marker").all())
    expect((await marker.boundingBox())!.height).toBeLessThanOrEqual(44);
});

test("buscar mantiene productos visibles y ofrece filtros en el mismo panel accesible", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/vista-previa/buscar?q=proteina");
  const card = page.locator(".search-product-grid .product-card").first();
  await expect(card).toBeVisible();
  const section = await page.locator(".search-page").boundingBox();
  expect((await card.boundingBox())!.y - section!.y).toBeLessThan(550);
  const toggle = page.locator(".catalog-panel-toggle");
  await toggle.click();
  const modal = page.getByRole("dialog", {
    name: "Filtrar y ordenar",
    exact: true,
  });
  await modal.getByLabel("Solo con stock", { exact: true }).check();
  await modal
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  await expect(page).toHaveURL(/stock=1/);
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Quitar filtro Solo con stock",
      exact: true,
    }),
  ).toBeVisible();
});
