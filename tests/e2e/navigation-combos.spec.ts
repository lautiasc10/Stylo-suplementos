import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";

const id = "22222222-2222-4222-8222-222222222222";
const catalog = demoCatalog();
catalog.products[0].variants[1].stock = 4;
catalog.products[2].variants[0].stock = 3;
const source = `data:image/webp;base64,${readFileSync("public/media/products-normalized-v1/1ee5a050-f660-42d0-9771-54535b2a8a37-eff70373188d-v1-640.webp").toString("base64")}`;
const imagePath = `promotions/${id}/33333333-3333-4333-8333-333333333333.webp`;
const images: Record<string, string> = { [imagePath]: source };
for (const product of catalog.products) {
  const path = `${product.id}/${product.id}.webp`;
  product.images = [{ id: product.id, path, position: 0, alt: product.name, variantId: null }];
  images[path] = source;
}
const promotion = { id, name: "Crea + proteína", kind: "bundle", active: true, imagePath,
  components: [catalog.products[0], catalog.products[1]].map((p) => ({ variantId: p.variants[0].id, quantity: 1 })),
  listPrice: 5000000, cashPrice: 4000000, startsAt: null, endsAt: null };

test.beforeEach(async ({ page }) => {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("stylo.navigation-combos-seeded")) {
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify({ catalog: data.catalog, images: data.images }));
      localStorage.setItem("stylo.promotions-preview.v1", JSON.stringify({ revision: 0, promotions: [data.promotion] }));
      localStorage.setItem("stylo.navigation-combos-seeded", "1");
    }
  }, { catalog, images, promotion });
});

test("la ficha conserva todos los filtros al cambiar de variante, recargar y volver", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const query = "categoria=proteinas&marca=marca-de-prueba-a&q=proteina&orden=price-desc&disponibilidad=in-stock";
  await page.goto(`/vista-previa?${query}`);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.locator(".reference-search-trigger kbd")).toHaveCount(0);
  const card = page.locator(".product-card:not(.combo-card)");
  await card.getByRole("link", { name: "Ver variantes", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("volver")).toContain("categoria=proteinas");
  await page.getByRole("button", { name: "Sabor siguiente", exact: true }).click();
  await expect(page.locator(".gainer-back-link")).toHaveAttribute("href", /marca=marca-de-prueba-a/);
  await page.reload();
  await page.getByRole("link", { name: "Volver a la tienda", exact: false }).filter({ hasText: "←" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/vista-previa");
  const params = new URL(page.url()).searchParams;
  expect(Object.fromEntries(params)).toEqual(Object.fromEntries(new URLSearchParams(query)));
  if (isMobile) await page.locator(".catalog-panel-toggle").click();
  await expect(page.locator('input[name="marca"][value="marca-de-prueba-a"]')).toBeChecked();
});

test("el combo tiene foto en tienda, ficha con ambos productos y agregado atómico", async ({ page, isMobile }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa?promocion=active");
  const card = page.locator(".combo-card");
  await expect(card).toHaveCount(1);
  await expect(card.getByRole("img", { name: "Combo Crea + proteína" })).toBeVisible();
  await page.locator(".catalog-results").screenshot({ path: info.outputPath(`combo-store-${isMobile ? "mobile" : "desktop"}.png`) });
  await card.getByRole("link", { name: "Ver combo", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/vista-previa/combo/${id}`));
  await expect(page.locator(".combo-detail-info li")).toHaveCount(2);
  await expect(page.locator(".combo-detail-price .animated-amount-target")).toHaveText("$ 40.000");
  await page.getByRole("radio", { name: "Mercado Pago", exact: true }).check();
  await expect(page.locator(".combo-detail-price .animated-amount-target")).toHaveText("$ 50.000");
  await page.screenshot({ path: info.outputPath(`combo-${isMobile ? "mobile" : "desktop"}.png`), fullPage: true });
  await page.getByRole("button", { name: "Agregar combo completo" }).click();
  await expect(page.getByRole("button", { name: "Agregado a la bolsa", exact: true })).toBeVisible();
  await page.locator(".cart-trigger").click();
  const bag = page.getByRole("dialog", { name: /Tu carrito/ });
  await expect(bag.getByLabel("Cantidad: 1", { exact: true })).toHaveCount(2);
  await expect(bag.locator(".bag-total dd")).toHaveText("$ 50.000");
  await page.keyboard.press("Escape");
  const back = "/vista-previa?categoria=creatinas";
  await page.goto(`/vista-previa/producto/creatina-de-prueba?volver=${encodeURIComponent(back)}`);
  await page.getByRole("link", { name: "Ver combo Crea + proteína", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/vista-previa/combo/${id}`));
  await expect(page.locator(".combo-back")).toHaveAttribute("href", back);
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("stylo.promotions-preview.v1")!);
    delete data.promotions[0].imagePath;
    localStorage.setItem("stylo.promotions-preview.v1", JSON.stringify(data));
  });
  await page.reload();
  await expect(page.locator('.combo-visual[data-composite="true"] img')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("la cinta cubre pantallas anchas y une el final con el principio sin pausa de hover", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero).toHaveAttribute("data-enhanced", "true");
  for (const width of [390, 1440, 2560, 3840]) {
    await page.setViewportSize({ width, height: 1000 });
    const seam = await page.locator(".hero-marquee-track").evaluate((track) => {
      const groups = track.children;
      const animation = track.getAnimations()[0];
      const duration = Number(animation.effect!.getTiming().duration);
      animation.pause(); animation.currentTime = 0;
      const start = groups[0].getBoundingClientRect().left;
      animation.currentTime = duration - .01;
      return { gap: Math.abs(start - groups[1].getBoundingClientRect().left), width: groups[0].getBoundingClientRect().width, viewport: track.parentElement!.clientWidth };
    });
    expect(seam.gap).toBeLessThan(1);
    expect(seam.width).toBeGreaterThanOrEqual(seam.viewport);
  }
  await page.locator(".hero-marquee").hover();
  await expect(page.locator(".hero-marquee-track")).toHaveCSS("animation-play-state", "running");
});

test("Atletas salta el recorrido cinematográfico y queda estable al terminar las animaciones", async ({ page }) => {
  await page.goto("/vista-previa/portada");
  await expect(page.locator(".sport-hero")).toHaveAttribute("data-enhanced", "true");
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "/vista-previa/portada#atletas";
    document.body.append(link); link.click(); link.remove();
  });
  await expect.poll(() => page.locator("#atletas").evaluate((node) => Math.abs(node.getBoundingClientRect().top))).toBeLessThan(100);
  await page.waitForTimeout(1700);
  expect(await page.locator("#atletas").evaluate((node) => Math.abs(node.getBoundingClientRect().top))).toBeLessThan(100);
  await page.reload();
  await expect.poll(() => page.locator("#atletas").evaluate((node) => Math.abs(node.getBoundingClientRect().top))).toBeLessThan(100);
});
