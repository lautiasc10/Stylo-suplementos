import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { flavorMotion } from "../../src/components/catalog/flavor-motion";

function fixture() {
  const catalog = demoCatalog();
  const product = catalog.products[0];
  product.slug = "whey-protein";
  product.name = "Whey Protein";
  product.variants = ["Banana", "Frutilla", "Vainilla", "Chocolate"].map(
    (flavor, i) => ({
      ...product.variants[0],
      id: `00000000-0000-4000-8000-00000000015${i}`,
      sku: `FLAVOR-TEST-${i}`,
      flavor,
      listPrice: 4500000 + i * 100000,
      cashPrice: 4100000 + i * 100000,
      stock: i === 1 ? 0 : 8,
    }),
  );
  product.images = [0, 0, 1, 2].map((variant, i) => ({
    id: `00000000-0000-4000-8000-00000000010${i}`,
    path: `${product.id}/00000000-0000-4000-8000-00000000020${i}.webp`,
    variantId: product.variants[variant].id,
    position: i,
    alt: `Foto ${product.variants[variant].flavor} ${i}`,
  }));
  const bytes = readFileSync("public/branding/logo-principal.webp");
  return {
    catalog,
    images: Object.fromEntries(
      product.images.map((image) => [
        image.path,
        `data:image/webp;base64,${bytes.toString("base64")}`,
      ]),
    ),
  };
}

async function seed(page: Page, data = fixture()) {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("stylo.catalog-preview.v1")) {
      localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
    }
  }, data);
  return data.catalog.products[0];
}

test("coreografía: origen circular, datos inmediatos y ningún cuadro con dos envases visibles", async ({
  page,
}) => {
  const product = await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  await expect(page.locator(".flavor-scene-layer")).toHaveCSS("opacity", "1");
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = original.call(this, frames, options);
      if (this.classList.contains("flavor-hero-pack")) animation.pause();
      return animation;
    };
  });
  const hero = page.locator(".flavor-product-detail");
  const next = page.getByRole("button", {
    name: "Sabor siguiente",
    exact: true,
  });
  await next.scrollIntoViewIfNeeded();
  const box = await hero.boundingBox(),
    arrow = await next.boundingBox();
  await next.click();
  await expect(hero).toHaveAttribute("data-variant", product.variants[1].id);
  await expect(page.locator('#contenido input[name="variantId"]')).toHaveValue(
    product.variants[1].id,
  );
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[1].id}`),
  );
  await expect
    .poll(() =>
      page
        .locator(".flavor-hero-pack")
        .evaluateAll(
          (elements) => elements.flatMap((el) => el.getAnimations()).length,
        ),
    )
    .toBe(2);
  const sampled = await page
    .locator(".flavor-hero-pack")
    .evaluateAll((elements) => {
      const animations = elements.flatMap((el) => el.getAnimations());
      let doubleFrames = 0;
      for (let t = 0; t <= 560; t += 1000 / 60) {
        animations.forEach((animation) => {
          animation.currentTime = t;
        });
        if (
          elements.filter(
            (element) => Number(getComputedStyle(element).opacity) > 0.001,
          ).length > 1
        )
          doubleFrames++;
      }
      return {
        doubleFrames,
        durations: animations.map((animation) => ({
          duration: animation.effect!.getTiming().duration,
          delay: animation.effect!.getTiming().delay,
        })),
      };
    });
  expect(sampled.doubleFrames).toBe(0);
  expect(sampled.durations).toEqual([
    { duration: flavorMotion.exit, delay: 0 },
    { duration: flavorMotion.enter, delay: flavorMotion.enterDelay },
  ]);
  const reveal = await page
    .locator('.flavor-hero-background[data-current="true"]')
    .evaluate((el) => {
      const animation = el.getAnimations()[0];
      return {
        duration: animation.effect!.getTiming().duration,
        start: (animation.effect as KeyframeEffect).getKeyframes()[0].clipPath,
      };
    });
  expect(reveal.duration).toBe(flavorMotion.background);
  await expect(page.locator(".flavor-hero-background")).toHaveCount(2);
  const backgroundAnimations = await page
    .locator('.flavor-hero-background[data-current="true"]')
    .evaluate((el) => ({
      fade: el
        .getAnimations()
        .find((animation) =>
          (animation.effect as KeyframeEffect)
            .getKeyframes()
            .some((frame) => frame.opacity !== undefined),
        )
        ?.effect?.getTiming().duration,
      zoom: el
        .querySelector(".flavor-hero-background-content")
        ?.getAnimations()[0]
        ?.effect?.getTiming().duration,
    }));
  expect(backgroundAnimations).toEqual({
    fade: flavorMotion.backgroundCrossfade,
    zoom: flavorMotion.backgroundScale,
  });
  const coords = String(reveal.start).match(/at ([\d.]+)px ([\d.]+)px/)!;
  expect(
    Math.abs(Number(coords[1]) - (arrow!.x + arrow!.width / 2 - box!.x)),
  ).toBeLessThan(2);
  expect(
    Math.abs(Number(coords[2]) - (arrow!.y + arrow!.height / 2 - box!.y)),
  ).toBeLessThan(2);
  await page
    .locator(".flavor-hero-pack")
    .evaluateAll((elements) =>
      elements.forEach((el) =>
        el.getAnimations().forEach((animation) => animation.finish()),
      ),
    );
  await expect(page.locator(".flavor-hero-pack")).toHaveCount(1);
  await expect(page.locator(".flavor-hero-background")).toHaveCount(1);
});

test("el fondo saliente conserva su movimiento durante el reveal y el nuevo lo retoma sin corte", async ({ page }) => {
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  const next = page.getByRole("button", {
    name: "Sabor siguiente",
    exact: true,
  });
  const scenes = page.locator(".flavor-hero-scenes");

  for (let index = 0; index < 2; index++) {
    const active = scenes.locator('.flavor-hero-background[data-current="true"]');
    await expect(active).toHaveAttribute("data-ambient", "true");
    const before = await active.locator(".flavor-hero-background-content").evaluate(async (element) => {
      const animation = element.getAnimations().find((item) =>
        item instanceof CSSAnimation && item.animationName === "flavor-ambient-drift",
      )!;
      animation.pause();
      await animation.ready;
      animation.currentTime = 8000;
      await new Promise(requestAnimationFrame);
      return getComputedStyle(element).transform;
    });
    await next.click();
    const outgoing = scenes.locator('.flavor-hero-background[data-outgoing="true"]');
    await expect(outgoing).toHaveAttribute("data-ambient", "true");
    const during = await outgoing.locator(".flavor-hero-background-content").evaluate((element) => {
      const animation = element.getAnimations().find((item) =>
        item instanceof CSSAnimation && item.animationName === "flavor-ambient-drift",
      );
      return { transform: getComputedStyle(element).transform, time: animation?.currentTime };
    });
    expect(during.transform).toBe(before);
    expect(Number(during.time)).toBeCloseTo(8000, 0);
    await expect(scenes.locator(".flavor-hero-background")).toHaveCount(1);
    await expect(scenes.locator('.flavor-hero-background[data-current="true"]'))
      .toHaveAttribute("data-ambient", "true");
  }
});

test("la compra y la URL responden incluso si decode del nuevo envase está pendiente", async ({
  page,
}) => {
  const product = await seed(page);
  await page.addInitScript(() => {
    const original = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      const task = original.call(this);
      if (this.alt !== "Foto Frutilla 2") return task;
      return task.then(
        () =>
          new Promise<void>((resolve) => {
            (
              window as Window & { releaseFlavorPhoto?: () => void }
            ).releaseFlavorPhoto = resolve;
          }),
      );
    };
  });
  await page.goto("/vista-previa/producto/whey-protein");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator('#contenido input[name="variantId"]')).toHaveValue(
    product.variants[1].id,
  );
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[1].id}`),
  );
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof (window as Window & { releaseFlavorPhoto?: () => void })
            .releaseFlavorPhoto,
      ),
    )
    .toBe("function");
  await page.evaluate(() =>
    (
      window as Window & { releaseFlavorPhoto?: () => void }
    ).releaseFlavorPhoto?.(),
  );
  await expect(page.locator(".flavor-hero-pack")).toHaveCount(1);
});

test("diez cambios rápidos por sentido, chips, teclado y swipe dejan selección y URL coherentes", async ({
  page,
}) => {
  const product = await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  const hero = page.locator(".flavor-product-detail");
  let index = 0;
  for (const direction of [1, -1])
    for (let i = 0; i < 10; i++) {
      await page
        .getByRole("button", {
          name: direction > 0 ? "Sabor siguiente" : "Sabor anterior",
          exact: true,
        })
        .dispatchEvent("click", {
          detail: 1,
          clientX: direction > 0 ? 300 : 40,
          clientY: 300,
        });
      index = (index + direction + 4) % 4;
      await expect(hero).toHaveAttribute(
        "data-variant",
        product.variants[index].id,
      );
      expect(
        await page.locator(".flavor-hero-background").count(),
      ).toBeLessThanOrEqual(2);
      expect(
        await page.locator(".flavor-hero-pack").count(),
      ).toBeLessThanOrEqual(2);
    }
  await page.locator(".variant-chip").nth(2).click();
  await expect(hero).toHaveAttribute("data-variant", product.variants[2].id);
  const previous = page.getByRole("button", {
    name: "Sabor anterior",
    exact: true,
  });
  await previous.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(hero).toHaveAttribute("data-variant", product.variants[1].id);
  const stage = page.locator(".flavor-hero-gallery .product-image-stage");
  await stage.dispatchEvent("pointerdown", {
    pointerType: "touch",
    isPrimary: true,
    clientX: 280,
    clientY: 150,
  });
  await stage.dispatchEvent("pointerup", {
    pointerType: "touch",
    isPrimary: true,
    clientX: 80,
    clientY: 155,
  });
  await expect(hero).toHaveAttribute("data-variant", product.variants[2].id);
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[2].id}`),
  );
  await expect(page.locator('#contenido input[name="variantId"]')).toHaveValue(
    product.variants[2].id,
  );
  await expect(page.locator(".flavor-hero-background")).toHaveCount(1);
  await expect(page.locator(".flavor-hero-pack")).toHaveCount(1);
});

test("los cambios repetidos conservan el reveal aun tras cuadros lentos", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let remaining = 4;
        const slow = () => {
          const end = performance.now() + 48;
          while (performance.now() < end) {
            /* Deterministic CPU pressure for the watchdog. */
          }
          if (--remaining) requestAnimationFrame(slow);
          else resolve();
        };
        requestAnimationFrame(slow);
      }),
  );
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-flavor-motion",
    "full",
  );
  const reveal = await page.locator('.flavor-hero-background[data-current="true"]')
    .evaluate((element) => element.getAnimations().some((animation) =>
      (animation.effect as KeyframeEffect).getKeyframes().some((frame) => frame.clipPath !== undefined),
    ));
  expect(reveal).toBe(true);
});

test("todos los fondos disponibles siguen el sabor y conservan el color de las categorías", async ({
  page,
}) => {
  const data = fixture();
  const product = data.catalog.products[0];
  const base = product.variants[0];
  const image = Object.values(data.images)[0];
  const flavors = [
    "Banana",
    "Frutilla",
    "Vainilla",
    "Ananá",
    "Cereza",
    "Choco suizo",
    "Cookies",
    "Dulce de leche",
    "fru. rojos",
    "Limón",
    "Multifruta",
    "Naranja",
    "Pomelo rosado",
    "Sandía",
    "Uva",
    "Citrus",
  ];
  const themes = [
    "banana",
    "frutilla",
    "vainilla",
    "anana",
    "cereza",
    "chocolate",
    "cookies",
    "dulce",
    "frutos-rojos",
    "limon",
    "multifruta",
    "naranja",
    "pomelo",
    "sandia",
    "uva",
    "citrus",
  ];
  product.variants = flavors.map((flavor, i) => ({
    ...base,
    flavor,
    id: `00000000-0000-4000-8000-${String(150 + i).padStart(12, "0")}`,
    sku: `SCENE-${i}`,
  }));
  product.images = [
    {
      id: "00000000-0000-4000-8000-000000000250",
      variantId: null,
      position: 0,
      path: `${product.id}/00000000-0000-4000-8000-000000000350.webp`,
      alt: "Envase compartido de prueba",
    },
  ];
  data.images = Object.fromEntries(
    product.images.map((photo) => [photo.path, image]),
  );
  await seed(page, data);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa/producto/whey-protein");
  for (let i = 0; i < themes.length; i++) {
    await page.locator(".gainer-flavor-options a").nth(i).click();
    const root = page.locator(".flavor-product-detail");
    await expect(root).toHaveAttribute("data-flavor", themes[i]);
    const layer = page.locator(".flavor-scene-layer:not([data-outgoing])");
    await expect(layer).toHaveAttribute("data-flavor", themes[i]);
    await expect
      .poll(() =>
        layer
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const color = (selector: string) =>
            getComputedStyle(document.querySelector(selector)!).backgroundColor;
          return (
            color(".flavor-product-detail") ===
              color(".flavor-scene-surface:not([data-outgoing])") &&
            color(".flavor-product-detail") === color(".category-navigation")
          );
        }),
      )
      .toBe(true);
    if (themes[i] === "citrus") {
      const sources = await layer
        .locator("img")
        .evaluateAll((images) => [
          ...new Set(images.map((img) => img.getAttribute("src"))),
        ]);
      expect(sources).toEqual([
        "/sabores/limon-decor-v1.webp",
        "/sabores/naranja-decor-v1.webp",
      ]);
    }
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("el menú conserva el color del sabor y excluye las partículas doradas", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  const navigation = page.getByRole("navigation", {
    name: "Explorar por categoría",
  });
  const panel = page.locator(".category-mega-menu");
  for (const flavor of ["banana", "frutilla"]) {
    await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
      "data-flavor",
      flavor,
    );
    await navigation.getByRole("link", { name: "Proteínas" }).hover();
    await expect(panel).toHaveAttribute("data-open", "true");
    await expect(panel.locator("canvas")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            getComputedStyle(document.querySelector(".category-mega-menu")!)
              .backgroundColor ===
            getComputedStyle(document.querySelector(".category-navigation")!)
              .backgroundColor,
        ),
      )
      .toBe(true);
    await page.keyboard.press("Escape");
    if (flavor === "banana")
      await page
        .getByRole("button", { name: "Sabor siguiente", exact: true })
        .click();
  }
});

test("las flechas sincronizan fondo, foto, stock, precio y carrito sin navegar", async ({
  page,
}) => {
  const product = await seed(page);
  let navigations = 0;
  page.on("request", (request) => {
    if (
      request.isNavigationRequest() ||
      (request.headers().rsc === "1" &&
        request.headers()["next-router-prefetch"] !== "1" &&
        request.url().includes("/producto/whey-protein"))
    )
      navigations++;
  });
  await page.goto("/vista-previa/producto/whey-protein");
  const scene = page.locator(".flavor-product-detail");
  await expect(scene).toHaveAttribute("data-flavor", "banana");
  const bounds = await scene.boundingBox();
  expect(bounds!.width).toBe(page.viewportSize()!.width);
  expect(bounds!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height);
  await expect(page.getByLabel("Presentación", { exact: true })).toHaveCount(0);
  const baseline = navigations;
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-flavor", "frutilla");
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Frutilla");
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Frutilla 2",
  );
  await expect(
    page.locator('.flavor-product-detail .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[1].id);
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#contenido .transfer-pricing")).toContainText(
    "46.000",
  );
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[1].id}`),
  );
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-flavor", "vainilla");
  await page
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".cart-variant")).toContainText(
    "Vainilla",
  );
  expect(navigations).toBe(baseline);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(scene).toHaveAttribute("data-flavor", "vainilla");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("la ficha no muestra miniaturas y las flechas recorren variantes sin foto", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  await expect(page.locator(".product-thumbnail-rail")).toHaveCount(0);
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Banana 0",
  );
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-flavor",
    "banana",
  );
  await page
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Chocolate");
  await expect(page.locator(".product-no-photo")).toContainText(
    "Imagen del producto pendiente",
  );
  await expect(page.locator(".product-no-photo")).toBeVisible();
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-flavor",
    "chocolate",
  );
  await expect(
    page.locator(".flavor-scene-layer:not([data-outgoing])"),
  ).toHaveAttribute("data-flavor", "chocolate");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Banana");
});

test("cambios rápidos conservan solo dos capas y movimiento reducido cancela el giro", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  const next = page.getByRole("button", {
    name: "Sabor siguiente",
    exact: true,
  });
  await next.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Vainilla");
  expect(await page.locator(".flavor-scene-layer").count()).toBeLessThanOrEqual(
    2,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".flavor-scene-layer")).toHaveCount(1);
  await expect(page.locator(".variant-spinner")).toHaveAttribute(
    "data-spinner-phase",
    "idle",
  );
  await expect(page.locator(".variant-spinner-frame")).toHaveCount(1);
  await expect(page.locator(".flavor-product-detail")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Frutilla");
  await expect(
    page.getByRole("button", { name: "Sabor anterior", exact: true }),
  ).toBeFocused();
  await expect(
    page.locator(".flavor-scene-layer:not([data-outgoing])"),
  ).toHaveCSS("animation-name", "none");
});

test("una foto fallida informa el error sin retrasar la selección de compra", async ({
  page,
}) => {
  const data = fixture();
  const product = data.catalog.products[0];
  data.images[product.images[2].path] = "data:image/webp;base64,broken";
  await seed(page, data);
  await page.goto("/vista-previa/producto/whey-protein");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page.locator(".gallery-message")).toContainText(
    "No pudimos cargar esta imagen",
  );
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-flavor",
    "frutilla",
  );
  await expect(
    page.locator('.flavor-product-detail .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[1].id);
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Frutilla 2",
  );
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
});

test("la decoración fallida no bloquea el sabor y otros productos comparten la información", async ({
  page,
}) => {
  await seed(page);
  await page.route("**/sabores/frutilla-decor-v1.webp", (route) =>
    route.abort(),
  );
  await page.goto("/vista-previa/producto/whey-protein");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Frutilla");
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Foto Frutilla 2",
  );
  await page.goto("/vista-previa/producto/creatina-de-prueba");
  await expect(page.locator(".gainer-flavor-picker")).toBeVisible();
  await expect(page.locator(".flavor-scene-decorations")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sabor siguiente", exact: true }),
  ).toHaveCount(0);
});

test("el movimiento ambiente empieza tras el reveal, se pausa y respeta movimiento reducido", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/vista-previa/producto/whey-protein");
  const decor = page.locator(".flavor-scene-decorations");
  await expect(page.locator(".flavor-product-detail")).toHaveAttribute(
    "data-choreography",
    "true",
  );
  await expect(page.getByRole("button", { name: /Pausar fondo/i })).toHaveCount(
    0,
  );
  await expect(decor).toHaveAttribute("data-ambient", "true");
  const initialBackground = decor.locator('.flavor-hero-background[data-current="true"] .flavor-hero-background-content');
  await expect(initialBackground).toHaveCSS("animation-play-state", "running");
  const ingredient = decor.locator('.flavor-scene-piece[data-place="hero"] img').first();
  await expect(ingredient).toHaveCSS("animation-name", "flavor-ingredient-float");
  const movement = await ingredient.evaluate((element) => {
    const animation = element.getAnimations()[0];
    animation.pause();
    animation.currentTime = 0;
    const start = getComputedStyle(element).transform;
    animation.currentTime = 5500;
    const middle = getComputedStyle(element).transform;
    return { start, middle };
  });
  expect(movement.middle).not.toBe(movement.start);
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  const layer = decor.locator('.flavor-scene-layer[data-flavor="frutilla"]');
  await expect(layer).toHaveCSS("opacity", "1");
  const background = decor.locator('.flavor-hero-background[data-current="true"] .flavor-hero-background-content');
  await expect(decor).toHaveAttribute("data-ambient", "true");
  await expect(background).toHaveCSS("animation-name", "flavor-ambient-drift");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(background).toHaveCSS("animation-play-state", "paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(decor).not.toHaveAttribute("data-ambient", "true");
  await expect(background).toHaveCSS("animation-name", "none");
  await expect(layer.locator("img").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".product-detail-copy")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
});

test("las fotos vecinas se preparan antes del clic y se reutilizan al recorrer sabores", async ({
  page,
}) => {
  const data = fixture();
  const paths = data.catalog.products[0].images;
  // Distinct, valid files make the cache check meaningful across real decodes.
  data.images[paths[2].path] =
    `data:image/webp;base64,${readFileSync("public/branding/logo-horizontal.webp").toString("base64")}`;
  data.images[paths[3].path] =
    `data:image/webp;base64,${readFileSync("public/branding/logo-completo.webp").toString("base64")}`;
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    (window as unknown as { decodes: string[] }).decodes = [];
    HTMLImageElement.prototype.decode = function () {
      // Count detached preload decodes, separately from the rendered frame's
      // own decode before a spin (which prevents a resolution handoff flash).
      if (!this.isConnected)
        (window as unknown as { decodes: string[] }).decodes.push(this.src);
      return decode.call(this);
    };
  });
  await seed(page, data);
  await page.goto("/vista-previa/producto/whey-protein");
  const strawberry = data.images[paths[2].path];
  await page.locator(".product-image-gallery-detail").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(
        (src) =>
          (window as unknown as { decodes: string[] }).decodes.filter(
            (value) => value === src,
          ).length,
        strawberry,
      ),
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Frutilla");
  await page
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Vainilla");
  await page
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(
    page.locator(
      '.variant-chip[aria-current="true"] > span:not([aria-hidden])',
    ),
  ).toHaveText("Frutilla");
  expect(
    await page.evaluate(
      (src) =>
        (window as unknown as { decodes: string[] }).decodes.filter(
          (value) => value === src,
        ).length,
      strawberry,
    ),
  ).toBe(1);
});
