import { test, expect, type Locator } from "@playwright/test";
import { seed, detail } from "./variant-ring-fixture";

async function finish(ring: Locator) {
  await ring.evaluate((e) =>
    e
      .querySelectorAll("*")
      .forEach((node) => node.getAnimations().forEach((a) => a.finish())),
  );
  await expect(ring).toHaveAttribute("data-ring-phase", "idle");
}

test("anillo completo: vecinas, rotación de 550 ms y roca fija; sin giro de carta", async ({
  page,
}) => {
  const { product } = await seed(page);
  await page.goto(detail);
  const ring = page.locator(".variant-ring-full"),
    stage = ring.locator(".product-image-stage");
  await ring.scrollIntoViewIfNeeded();
  await expect(
    ring.locator(".variant-ring-item[data-visible=true]"),
  ).toHaveCount(3);
  const before = await stage.evaluate((e) => ({
    w: e.clientWidth,
    h: e.clientHeight,
    bg: getComputedStyle(e).backgroundImage,
  }));
  for (const neighbor of await ring
    .locator('.variant-ring-item[data-visible=true]:not([data-current="true"])')
    .all()) {
    await expect(neighbor).toHaveCSS("opacity", "0.3");
    await expect(neighbor).toHaveCSS("pointer-events", "none");
    expect(await neighbor.evaluate((e) => e.style.transform)).toContain(
      "scale(0.55)",
    );
  }
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-ring-phase", "rotating");
  const animations = await ring.evaluate((e) =>
    [...e.querySelectorAll(".variant-ring-item")].flatMap((node) =>
      node.getAnimations().map((a) => {
        a.pause();
        return {
          duration: a.effect!.getTiming().duration,
          frames: (a.effect as KeyframeEffect).getKeyframes(),
        };
      }),
    ),
  );
  expect(animations.length).toBeGreaterThan(0);
  expect(animations.every((a) => a.duration === 550)).toBe(true);
  expect(
    animations
      .flatMap((a) => a.frames)
      .some((f) => String(f.transform).includes("translate3d")),
  ).toBe(true);
  expect(
    animations
      .flatMap((a) => a.frames)
      .some((f) => /rotateY\(-?90deg\)/.test(String(f.transform))),
  ).toBe(false);
  await finish(ring);
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[1].id,
  );
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[1].id}`),
  );
  await expect(
    page.locator('#contenido .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[1].id);
  await expect(
    page.locator('.variant-chip[aria-current="true"]'),
  ).toContainText("Frutilla");
  await expect(ring.locator(".variant-ring-item[data-current=true]")).toHaveCSS(
    "opacity",
    "1",
  );
  expect(
    await stage.evaluate((e) => ({
      w: e.clientWidth,
      h: e.clientHeight,
      bg: getComputedStyle(e).backgroundImage,
    })),
  ).toEqual(before);
  await expect(
    page.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await ring
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[0].id,
  );
});

test("ocho sabores: solo dos vecinas; chips lejanos y cola conservan la última elección", async ({
  page,
}) => {
  const { product } = await seed(page, false, false, 8);
  await page.goto(detail);
  const ring = page.locator(".variant-ring");
  await expect(
    ring.locator(".variant-ring-item[data-visible=true]"),
  ).toHaveCount(3);
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-ring-phase", "rotating");
  await ring.evaluate((e) =>
    e
      .querySelectorAll("*")
      .forEach((n) => n.getAnimations().forEach((a) => a.pause())),
  );
  const picker = page.locator(".variant-picker");
  await picker.getByRole("link", { name: /Naranja/ }).click();
  await picker.getByRole("link", { name: /Uva/ }).click();
  await ring.evaluate((e) =>
    e
      .querySelectorAll("*")
      .forEach((n) => n.getAnimations().forEach((a) => a.play())),
  );
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[7].id,
  );
  await expect(ring).toHaveAttribute("data-ring-phase", "idle");
  await ring.scrollIntoViewIfNeeded();
  await expect(
    ring.locator(".variant-ring-item[data-visible=true]"),
  ).toHaveCount(3);
  await expect(ring.locator(".variant-ring-count")).toHaveText("8/8");
  await expect(page).toHaveURL(new RegExp(product.variants[7].id));
});

test("card: no precarga sin intención; vecinas compactas, teclado, swipe y clic en precio", async ({
  page,
}, info) => {
  const { product } = await seed(page);
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "src",
    )!;
    const loads: string[] = [];
    Object.assign(window, { ringLoads: loads });
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      ...descriptor,
      set(value: string) {
        if (!this.isConnected && value) loads.push(value);
        descriptor.set!.call(this, value);
      },
    });
  });
  await page.goto("/vista-previa");
  const card = page.locator(".product-card"),
    ring = card.locator(".variant-ring-compact");
  await card.scrollIntoViewIfNeeded();
  await expect(ring).toHaveAttribute("data-enhanced", "true");
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as Window & { ringLoads: string[] }).ringLoads
          .length,
    ),
  ).toBe(0);
  await expect(
    ring.locator(".variant-ring-item[data-visible=true]"),
  ).toHaveCount(1);
  if (info.project.name === "desktop") await ring.hover();
  else await ring.dispatchEvent("pointerover", { pointerType: "mouse" });
  await expect(
    ring.locator(".variant-ring-item[data-visible=true]"),
  ).toHaveCount(3);
  expect(
    await ring
      .locator(
        '.variant-ring-item[data-visible=true]:not([data-current="true"])',
      )
      .first()
      .evaluate((e) => e.style.transform),
  ).toContain("scale(0.55)");
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[1].id,
  );
  await expect(card.locator(".stock-badge")).toHaveText("Sin stock");
  await expect(card.locator(".product-prices")).toContainText("46.000");
  await expect(page).toHaveURL(/\/vista-previa$/);
  const stage = ring.locator(".product-image-stage");
  await stage.dispatchEvent("pointerdown", {
    pointerType: "touch",
    isPrimary: true,
    clientX: 230,
    clientY: 100,
  });
  await stage.dispatchEvent("pointerup", {
    pointerType: "touch",
    isPrimary: true,
    clientX: 70,
    clientY: 105,
  });
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[2].id,
  );
  await card.locator(".product-prices").click();
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[2].id}`),
  );
});

test("tilt acotado, sin renders por movimiento, vuelve a cero y pausa durante el anillo", async ({
  page,
}) => {
  await seed(page);
  await page.goto(detail);
  const ring = page.locator(".variant-ring"),
    stage = ring.locator(".product-image-stage");
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  await stage.dispatchEvent("pointermove", {
    pointerType: "mouse",
    clientX: box.x + box.width * 0.92,
    clientY: box.y + box.height * 0.12,
  });
  await expect(stage).toHaveAttribute("data-tilting", "true");
  const values = await stage.evaluate((e) => [
    parseFloat(
      e
        .querySelector<HTMLElement>('[data-current="true"] .variant-ring-tilt')!
        .style.getPropertyValue("--rx"),
    ),
    parseFloat(
      e
        .querySelector<HTMLElement>('[data-current="true"] .variant-ring-tilt')!
        .style.getPropertyValue("--ry"),
    ),
    parseFloat(
      e
        .querySelector<HTMLElement>('[data-current="true"] .variant-ring-tilt')!
        .style.getPropertyValue("--sx"),
    ),
  ]);
  expect(values[0]).toBeGreaterThan(0);
  expect(values[0]).toBeLessThanOrEqual(8);
  expect(values[1]).toBeGreaterThan(0);
  expect(values[1]).toBeLessThanOrEqual(8);
  expect(values[2]).toBeLessThan(0);
  await stage.dispatchEvent("pointerout", {
    pointerType: "mouse",
    relatedTarget: null,
  });
  await expect(stage).toHaveAttribute("data-tilting", "false");
  expect(
    await stage.evaluate((e) =>
      e
        .querySelector<HTMLElement>('[data-current="true"] .variant-ring-tilt')!
        .style.getPropertyValue("--rx"),
    ),
  ).toBe("0deg");
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-ring-phase", "rotating");
  await stage.dispatchEvent("pointermove", {
    pointerType: "mouse",
    clientX: box.x + box.width,
    clientY: box.y,
  });
  expect(
    await stage.evaluate((e) =>
      e
        .querySelector<HTMLElement>('[data-current="true"] .variant-ring-tilt')!
        .style.getPropertyValue("--ry"),
    ),
  ).toBe("0deg");
  await expect(ring).toHaveAttribute("data-ring-phase", "idle");
});

test("movimiento reducido: fundido sin tilt ni brillo, incluso al cambiar la preferencia en vivo", async ({
  page,
}) => {
  const { product } = await seed(page);
  await page.goto(detail);
  const ring = page.locator(".variant-ring");
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-ring-phase", "rotating");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[1].id,
  );
  await expect(ring).toHaveAttribute("data-ring-phase", "idle");
  await expect(
    ring.locator(".variant-ring-item[data-visible=true]"),
  ).toHaveCount(1);
  await expect(
    ring.locator(".variant-ring-item[data-current=true] .variant-ring-light"),
  ).toHaveCSS("display", "none");
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-ring-phase", "fading");
  const frames = await ring.evaluate((e) =>
    [...e.querySelectorAll(".variant-ring-item")].flatMap((n) =>
      n
        .getAnimations()
        .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes()),
    ),
  );
  expect(frames.every((f) => !f.transform)).toBe(true);
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[2].id,
  );
});

test("una variante: solo tilt, sin flechas ni contador; miniaturas funden sin cambiar SKU", async ({
  page,
}) => {
  const { product } = await seed(page, false, true);
  await page.goto(detail);
  const ring = page.locator(".variant-ring");
  await expect(
    ring.locator(".variant-ring-item[data-visible=true]"),
  ).toHaveCount(1);
  await expect(ring.locator(".variant-navigation")).toHaveCount(0);
  await expect(ring.locator(".variant-ring-count")).toHaveCount(0);
  await ring.getByRole("link", { name: "Ver Frente 1", exact: true }).click();
  await expect(ring).toHaveAttribute("data-ring-phase", "fading");
  await expect(ring.locator(".product-frame-current")).toHaveAttribute(
    "alt",
    "Frente 1",
  );
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[0].id,
  );
  await expect(page).not.toHaveURL(/variante=/);
  await ring.locator(".product-image-stage").dispatchEvent("pointermove", {
    pointerType: "mouse",
    clientX: 300,
    clientY: 250,
  });
  await expect(ring.locator(".product-image-stage")).toHaveAttribute(
    "data-tilting",
    "true",
  );
});

test("una fotografía fallida conserva pack, precio, stock, carrito y URL", async ({
  page,
}) => {
  const { product } = await seed(page, true);
  await page.goto(detail);
  const ring = page.locator(".variant-ring");
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(ring.locator(".gallery-message")).toContainText(
    "No pudimos cargar esta imagen",
  );
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[0].id,
  );
  await expect(
    page.locator('#contenido .add-to-cart input[name="variantId"]'),
  ).toHaveValue(product.variants[0].id);
  await expect(page).not.toHaveURL(/variante=/);
  await page
    .locator(".variant-picker")
    .getByRole("link", { name: /Cookies/ })
    .click();
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[3].id,
  );
});

test("dos variantes: solo una vecina, intercambio sin salto y vuelta por flecha anterior", async ({
  page,
}) => {
  const { product } = await seed(page, false, false, 2);
  await page.goto(detail);
  const ring = page.locator(".variant-ring");
  await expect(
    ring.locator(".variant-ring-item[data-visible=true]"),
  ).toHaveCount(2);
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-ring-phase", "idle");
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[1].id,
  );
  const neighbor = ring.locator(
    '.variant-ring-item[data-visible=true]:not([data-current="true"])',
  );
  expect(await neighbor.evaluate((e) => e.style.transform)).toContain(
    "translate3d(-60%",
  );
  await ring
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-ring-phase", "idle");
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[0].id,
  );
  expect(await neighbor.evaluate((e) => e.style.transform)).toContain(
    "translate3d(60%",
  );
});

test("touch real: el arrastre vertical desplaza la página y un tap abre la variante activa", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== "mobile", "Solo touch");
  const { product } = await seed(page);
  await page.goto("/vista-previa");
  const ring = page.locator(".variant-ring"),
    stage = ring.locator(".product-image-stage");
  await stage.scrollIntoViewIfNeeded();
  await ring.locator(".product-frame-link").tap();
  await expect(page).toHaveURL(
    new RegExp(`variante=${product.variants[0].id}`),
  );
  await page.goBack();
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  const session = await context.newCDPSession(page);
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.75;
  const before = await page.evaluate(() => scrollY);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (const delta of [15, 35, 60, 90, 125])
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 2, y: y - delta }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await session.detach();
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(before + 20);
});
