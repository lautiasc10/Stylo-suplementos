import { expect, test } from "@playwright/test";

test("las dos poses copian el fundido y la zona central de la referencia", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "El seguimiento requiere un cursor preciso",
  );
  const errors: string[] = [];
  const videos: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("stylo-lion-motion")) videos.push(request.url());
  });
  await page.goto("/");
  const poses = page.locator(".reference-lion-poses");
  await expect(poses).toHaveAttribute("data-left-ready", "true");
  await expect(poses.locator("img")).toHaveCount(2);
  await expect(poses.locator("img").first()).toHaveCSS(
    "transition-duration",
    "0.7s",
  );
  await expect(poses).toHaveAttribute("data-facing", "right");
  const width = page.viewportSize()!.width;
  const move = (x: number) => page.mouse.move(width * x, 300);
  await move(0.2);
  await expect(poses).toHaveAttribute("data-facing", "left");
  await expect(poses.locator(".reference-lion-left")).toHaveCSS("opacity", "1");
  await move(0.5);
  await expect(poses).toHaveAttribute("data-facing", "left");
  await move(0.8);
  await expect(poses).toHaveAttribute("data-facing", "right");
  await expect(poses.locator(".reference-lion-right")).toHaveCSS(
    "opacity",
    "1",
  );
  await move(0.5);
  await expect(poses).toHaveAttribute("data-facing", "right");
  // Rapid reversals keep the same two mounted images and settle correctly.
  const images = await poses
    .locator("img")
    .evaluateAll((items) => items.map((img) => img.getAttribute("src")));
  for (let i = 0; i < 10; i++) await move(i % 2 ? 0.8 : 0.2);
  await expect(poses).toHaveAttribute("data-facing", "right");
  await expect(poses.locator(".reference-lion-right")).toHaveCSS(
    "opacity",
    "1",
  );
  expect(
    await poses
      .locator("img")
      .evaluateAll((items) => items.map((img) => img.getAttribute("src"))),
  ).toEqual(images);
  expect(videos).toEqual([]);
  expect(errors).toEqual([]);
});

test("el tilt sigue al cursor, se congela al pausar y respeta movimiento reducido", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero).toHaveAttribute("data-enhanced", "true");
  const tilt = hero.locator(".hero-lion-tilt");
  const rotation = () => tilt.evaluate((el) => el.style.transform);
  await page.mouse.move(180, 250);
  await expect.poll(rotation).toContain("rotateY(-");
  await page.mouse.move(1100, 500);
  await expect.poll(rotation).toMatch(/rotateY\([0-9]/);
  await hero.getByRole("button", { name: "Pausar animación del hero" }).click();
  const frozen = await rotation();
  const facing = await hero
    .locator(".reference-lion-poses")
    .getAttribute("data-facing");
  await page.mouse.move(100, 250);
  await page.waitForTimeout(200);
  expect(await rotation()).toBe(frozen);
  await expect(hero.locator(".reference-lion-poses")).toHaveAttribute(
    "data-facing",
    facing!,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(rotation).toBe("");
  await expect(hero.locator(".reference-lion-poses")).toHaveAttribute(
    "data-facing",
    "right",
  );
  await expect(hero.locator("img").first()).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(hero.locator("canvas,video")).toHaveCount(0);
});

test("si falta la pose izquierda se conserva el león y la tienda sigue accesible", async ({
  page,
}) => {
  await page.route("**/stylo-lion-poster-left-v1.webp", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await page.mouse.move(100, 250);
  const right = page.locator(".reference-lion-right");
  await expect
    .poll(() => right.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await expect(right).toHaveCSS("opacity", "1");
  await page.locator(".sport-hero .hero-pill-primary").click();
  await expect(page).toHaveURL(/\/catalogo$/);
});

test("en móvil conserva el león sin seguimiento ni descargas de video", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  const videos: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("stylo-lion-motion")) videos.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".reference-lion-right")).toHaveCSS("opacity", "1");
  await expect(page.locator(".reference-lion-poses")).toHaveAttribute(
    "data-facing",
    "right",
  );
  expect(
    await page.locator(".hero-lion-tilt").evaluate((el) => el.style.transform),
  ).toBe("rotateX(0deg) rotateY(0deg)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(videos).toEqual([]);
});
