import { test, expect, type Page } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

async function seed(page: Page, broken = false, single = false) {
  const catalog = demoCatalog(),
    product = catalog.products[0];
  catalog.products = [product];
  const photos = await page.evaluate(() =>
    ["Banana", "Frutilla", "Vainilla", "Cookies"].map((name, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 500;
      const c = canvas.getContext("2d")!;
      c.fillStyle = "#fff";
      c.fillRect(140, 50, 220, 400);
      c.fillStyle = ["#d8b474", "#dd6677", "#ccc0a0", "#997755"][index];
      c.fillRect(140, 70, 220, 80);
      c.fillStyle = "#111";
      c.font = "24px sans-serif";
      c.fillText(name, 160, 230);
      return canvas.toDataURL("image/webp");
    }),
  );
  product.variants = ["Banana", "Frutilla", "Vainilla", "Cookies"]
    .slice(0, single ? 1 : 4)
    .map((flavor, i) => ({
      ...product.variants[0],
      id: `00000000-0000-4000-8000-00000000006${i}`,
      sku: `SPINNER-${i}`,
      flavor,
      stock: i === 1 ? 0 : 8,
      listPrice: 4500000 + i * 100000,
      cashPrice: 4100000 + i * 100000,
    }));
  product.images = (
    single ? [product.variants[0], product.variants[0]] : product.variants
  ).map((v, i) => ({
    id: `00000000-0000-4000-8000-00000000007${i}`,
    variantId: v.id,
    position: i,
    path: `${product.id}/00000000-0000-4000-8000-00000000008${i}.webp`,
    alt: `Frente ${single ? i : v.flavor}`,
  }));
  product.turnImages = [
    {
      id: "00000000-0000-4000-8000-000000000090",
      path: `${product.id}/00000000-0000-4000-8000-000000000091.webp`,
      variantId: null,
      view: "back",
      position: 0,
      alt: "Dorso del envase",
    },
  ];
  product.informationImages = [
    {
      id: "00000000-0000-4000-8000-000000000092",
      path: `${product.id}/00000000-0000-4000-8000-000000000093.webp`,
      variantId: null,
      position: 0,
      alt: "Información nutricional",
    },
  ];
  const images = Object.fromEntries(
    [
      ...product.images,
      ...product.turnImages,
      ...product.informationImages,
    ].map((image, i) => [
      image.path,
      broken && i === 1
        ? "data:image/webp;base64,broken"
        : photos[i % photos.length],
    ]),
  );
  await page.addInitScript(
    (data) => {
      if (!localStorage.getItem("stylo.catalog-preview.v1"))
        localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
    },
    { catalog, images },
  );
  return { product, photos };
}
const detail = "/vista-previa/producto/proteina-de-prueba";

test("giro de 200 + 280 ms, sentido reversible y roca fija; solo dos capas", async ({
  page,
}) => {
  const { product } = await seed(page);
  await page.goto("/vista-previa");
  const spinner = page.locator(".variant-spinner");
  await spinner.scrollIntoViewIfNeeded();
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .focus();
  const stage = spinner.locator(".product-image-stage");
  const before = await stage.evaluate((e) => ({
    width: e.clientWidth,
    height: e.clientHeight,
    background: getComputedStyle(e).backgroundImage,
  }));
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(spinner).toHaveAttribute("data-spinner-phase", "outgoing");
  const exit = await spinner
    .locator(".variant-spinner-frame")
    .evaluateAll((frames) =>
      frames.flatMap((frame) =>
        frame.getAnimations().map((a) => {
          a.pause();
          return {
            duration: a.effect!.getTiming().duration,
            frames: (a.effect as KeyframeEffect).getKeyframes(),
          };
        }),
      ),
    );
  expect(exit[0].duration).toBe(200);
  expect(exit[0].frames.at(-1)!.transform).toContain("rotateY(-90deg)");
  await expect(spinner.locator(".variant-spinner-frame")).toHaveCount(2);
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[0].id,
  );
  await spinner.evaluate((e) =>
    e
      .querySelectorAll(".variant-spinner-frame")
      .forEach((f) => f.getAnimations().forEach((a) => a.finish())),
  );
  await expect(spinner).toHaveAttribute("data-spinner-phase", "incoming");
  const enter = await spinner
    .locator(".variant-spinner-frame")
    .evaluateAll((frames) =>
      frames
        .flatMap((frame) =>
          frame.getAnimations().map((a) => {
            a.pause();
            return {
              duration: a.effect!.getTiming().duration,
              frames: (a.effect as KeyframeEffect).getKeyframes(),
            };
          }),
        )
        .filter((a) => a.duration === 280),
    );
  expect(enter[0].frames[0].transform).toContain("rotateY(90deg)");
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[1].id,
  );
  expect(await stage.evaluate((e) => e.getAnimations().length)).toBe(0);
  expect(
    await stage.evaluate((e) => ({
      width: e.clientWidth,
      height: e.clientHeight,
      background: getComputedStyle(e).backgroundImage,
    })),
  ).toEqual(before);
  await spinner.evaluate((e) =>
    e
      .querySelectorAll(".variant-spinner-frame")
      .forEach((f) => f.getAnimations().forEach((a) => a.finish())),
  );
  await expect(spinner).toHaveAttribute("data-spinner-phase", "idle");
  await expect(spinner.locator(".variant-spinner-frame")).toHaveCount(1);
  await spinner
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(spinner).toHaveAttribute("data-spinner-phase", "outgoing");
  const backward = await spinner.evaluate((e) =>
    e
      .querySelectorAll(".variant-spinner-frame")[0]
      .getAnimations()
      .map(
        (a) => (a.effect as KeyframeEffect).getKeyframes().at(-1)!.transform,
      ),
  );
  expect(backward[0]).toContain("rotateY(90deg)");
  await expect(spinner).toHaveAttribute("data-spinner-phase", "idle");
});

test("tarjeta: flechas, teclado, swipe y enlace abren la misma variante sin navegar al pulsar controles", async ({
  page,
}, info) => {
  const { product } = await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vista-previa");
  const card = page.locator(".product-card"),
    spinner = card.locator(".variant-spinner");
  await card.scrollIntoViewIfNeeded();
  if (info.project.name === "desktop") await card.hover();
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(page).toHaveURL(/\/vista-previa$/);
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[1].id,
  );
  await expect(card.locator(".product-card-marker-current")).toHaveText(
    "Frutilla",
  );
  await expect(card.locator(".stock-badge")).toHaveText("Sin stock");
  await expect(card.locator(".product-prices")).toContainText("46.000");
  await expect(card.locator(".product-card-action")).toHaveAttribute(
    "href",
    new RegExp(product.variants[1].id),
  );
  await expect(spinner).toHaveAttribute("data-spinner-phase", "idle");
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[2].id,
  );
  await expect(spinner).toHaveAttribute("data-spinner-phase", "idle");
  const stage = spinner.locator(".product-image-stage");
  await stage.dispatchEvent("pointerdown", {
    pointerType: "touch",
    isPrimary: true,
    clientX: 200,
    clientY: 100,
  });
  await stage.dispatchEvent("pointerup", {
    pointerType: "touch",
    isPrimary: true,
    clientX: 70,
    clientY: 105,
  });
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[3].id,
  );
  // The pricing area also opens the selected flavor, beyond the native links.
  await card.locator(".product-prices").click();
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[3].id}`),
  );
  await expect(page.locator(".variant-chip[aria-current=true]")).toContainText(
    "Cookies",
  );
});

test("una imagen lenta no cambia el SKU antes de decode; errores conservan el estado y permiten reintentar", async ({
  page,
}) => {
  const { product, photos } = await seed(page);
  await page.addInitScript((delayed) => {
    const decode = HTMLImageElement.prototype.decode;
    const state = window as Window & {
      spinnerRelease?: () => void;
      spinnerAllowed?: boolean;
    };
    HTMLImageElement.prototype.decode = function () {
      const result = decode.call(this);
      return this.src === delayed && !state.spinnerAllowed
        ? result.then(
            () =>
              new Promise<void>((resolve) => {
                state.spinnerRelease = () => {
                  state.spinnerAllowed = true;
                  resolve();
                };
              }),
          )
        : result;
    };
  }, photos[1]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(detail);
  const spinner = page.locator(".variant-spinner");
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(spinner).toHaveAttribute("data-spinner-phase", "loading");
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[0].id,
  );
  await expect(
    page.locator('#contenido .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[0].id);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof (window as Window & { spinnerRelease?: () => void })
            .spinnerRelease,
      ),
    )
    .toBe("function");
  await page.evaluate(() =>
    (window as Window & { spinnerRelease?: () => void }).spinnerRelease?.(),
  );
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[1].id,
  );
  await expect(spinner).toHaveAttribute("data-spinner-phase", "idle");
});

test("fallo de fotografía conserva pack, precio, stock y URL anteriores", async ({
  page,
}) => {
  const { product } = await seed(page, true);
  await page.goto(detail);
  const spinner = page.locator(".variant-spinner");
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(spinner.locator(".gallery-message")).toContainText(
    "No pudimos cargar esta imagen",
  );
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[0].id,
  );
  await expect(
    page.locator('#contenido .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[0].id);
  await expect(page).not.toHaveURL(/variante=/);
  await page
    .locator(".gainer-flavor-picker")
    .getByRole("link", { name: /Cookies/ })
    .click();
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[3].id,
  );
});

test("solo se conserva la última elección encolada y reduced-motion elimina la rotación", async ({
  page,
}) => {
  const { product } = await seed(page);
  await page.goto(detail);
  const spinner = page.locator(".variant-spinner");
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(spinner).toHaveAttribute("data-spinner-phase", "incoming");
  await spinner.evaluate((e) =>
    e
      .querySelectorAll(".variant-spinner-frame")
      .forEach((f) => f.getAnimations().forEach((a) => a.pause())),
  );
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await spinner.evaluate((e) =>
    e
      .querySelectorAll(".variant-spinner-frame")
      .forEach((f) => f.getAnimations().forEach((a) => a.play())),
  );
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[3].id,
  );
  await expect(spinner).toHaveAttribute("data-spinner-phase", "idle");
  await expect(spinner.locator(".variant-spinner-frame")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await spinner
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(spinner).toHaveAttribute("data-spinner-phase", "incoming");
  const frames = await spinner.evaluate((e) =>
    [...e.querySelectorAll(".variant-spinner-frame")].flatMap((f) =>
      f
        .getAnimations()
        .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes()),
    ),
  );
  expect(frames.every((f) => !f.transform || f.transform === "none")).toBe(
    true,
  );
  await expect(spinner).toHaveAttribute("data-spinner-phase", "idle");
});

test("detalle responde al inicio del giro, solapa sus mitades y conserva la información sin miniaturas", async ({
  page,
}) => {
  const { product } = await seed(page);
  await page.goto(detail);
  const spinner = page.locator(".variant-spinner");
  await expect(spinner.locator(".product-thumbnail-rail")).toHaveCount(0);
  await spinner
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(spinner).toHaveAttribute("data-spinner-phase", "incoming");
  const timing = await spinner.evaluate((e) =>
    [...e.querySelectorAll(".variant-spinner-frame")].flatMap((frame) =>
      frame.getAnimations().map((animation) => {
        animation.pause();
        const timing = animation.effect!.getTiming();
        return { duration: timing.duration, delay: timing.delay };
      }),
    ),
  );
  expect(timing).toEqual([
    { duration: 140, delay: 0 },
    { duration: 260, delay: 100 },
  ]);
  await expect(spinner).toHaveAttribute(
    "data-active-variant",
    product.variants[1].id,
  );
  await expect(page.locator('#contenido input[name="variantId"]')).toHaveValue(
    product.variants[1].id,
  );
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[1].id}`),
  );
  await expect(spinner.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Frente Frutilla",
  );
  await spinner.evaluate((e) =>
    e
      .querySelectorAll(".variant-spinner-frame")
      .forEach((frame) =>
        frame.getAnimations().forEach((animation) => animation.finish()),
      ),
  );
  await expect(spinner).toHaveAttribute("data-spinner-phase", "idle");
  await page.locator(".product-information summary").click();
  await expect(page.locator(".product-information-grid")).toContainText(
    "Información nutricional",
  );
});

test("producto con una variante: flechas recorren las fotografías, sin controles de sabor", async ({
  page,
}) => {
  await seed(page, false, true);
  await page.goto(detail);
  await expect(
    page.getByRole("button", { name: "Sabor siguiente", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Siguiente imagen", exact: true })
    .click();
  await expect(page.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Frente 1",
  );
  await expect(page.locator(".product-image-gallery")).toHaveAttribute(
    "data-transition",
    "fade",
  );
});
