import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

const slugs = [
  "onefit-creatina-micronizada-poweraded-x-200gr",
  "xbody-zinc-magnesio-vitamina-b6-zma-90-capsulas",
  "star-nutrition-cafeina-200-x-30-caps",
];

async function seed(page: Page, slug: string, flavor = "Sin sabor") {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  product.slug = slug;
  product.variants = [{ ...product.variants[0], flavor, stock: 3 }];
  product.images = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      path: `${product.id}/00000000-0000-4000-8000-000000000102.webp`,
      variantId: product.variants[0].id,
      position: 0,
      alt: "Envase de prueba",
    },
  ];
  const data = {
    catalog,
    images: {
      [product.images[0].path]:
        `data:image/webp;base64,${readFileSync("public/branding/logo-principal.webp").toString("base64")}`,
    },
  };
  await page.addInitScript((data) => {
    localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
  }, data);
  return product;
}

for (const slug of slugs) {
  test(`la prueba sin sabor conserva la compra y el contenido: ${slug}`, async ({
    page,
  }) => {
    const product = await seed(page, slug);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`/vista-previa/producto/${slug}`);
    const scene = page.locator(".neutral-product-detail");
    await expect(scene).toBeVisible();
    await expect(scene.locator(".neutral-product-scene")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expect(scene.locator("canvas, video")).toHaveCount(0);
    await expect(scene.locator(".product-image-stage")).toHaveCSS(
      "background-image",
      "none",
    );
    await expect(scene.getByRole("heading", { level: 1 })).toHaveText(
      product.name,
    );
    await expect(
      scene.locator('.add-to-cart input[name="variantId"]'),
    ).toHaveValue(product.variants[0].id);
    await expect(scene.locator(".editorial-pricing-list")).toContainText(
      "precio de lista",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await scene
      .getByRole("button", { name: "Agregar al carrito", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("dialog").locator(".cart-variant"),
    ).toContainText("Sin sabor");
    expect(errors).toEqual([]);
  });
}

test("el ambiente se detiene antes de cinco segundos, se pausa y respeta movimiento reducido", async ({
  page,
}) => {
  await seed(page, slugs[0]);
  await page.goto(`/vista-previa/producto/${slugs[0]}`);
  const scene = page.locator(".neutral-product-scene");
  const particles = scene.locator(".neutral-scene-particles-near");
  await expect(scene).toHaveAttribute("data-motion", "true");
  await expect(particles).toHaveCSS("animation-play-state", "running");
  const timing = await particles.evaluate((element) => {
    const timing = element.getAnimations()[0].effect!.getTiming();
    return { duration: timing.duration, iterations: timing.iterations };
  });
  expect(Number(timing.duration)).toBeLessThanOrEqual(5000);
  expect(timing.iterations).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(particles).toHaveCSS("animation-play-state", "paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(particles).toHaveCSS("animation-name", "none");
  await expect(particles).toHaveCSS("will-change", "auto");
  await expect(
    page.getByRole("button", { name: "Agregar al carrito", exact: true }),
  ).toBeEnabled();
});

test("la escena se extiende a cualquier ficha sin sabor y conserva los fondos de sabor", async ({
  page,
}) => {
  await seed(page, "sin-sabor-fuera-de-prueba");
  await page.goto("/vista-previa/producto/sin-sabor-fuera-de-prueba");
  await expect(page.locator(".neutral-product-scene")).toHaveCount(1);
  await seed(page, slugs[0], "Banana");
  await page.goto(`/vista-previa/producto/${slugs[0]}`);
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-flavor",
    "banana",
  );
  await expect(page.locator(".neutral-product-scene")).toHaveCount(0);
});
