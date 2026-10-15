import { expect, test } from "@playwright/test";

test("el hero conserva accesos y muestra un fotograma mientras carga", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
    "Bienvenido a STYLO SUPLEMENTOS",
  );
  await expect(hero).toContainText("Una nueva experiencia está por comenzar.");
  await expect(hero).toContainText("Potenciá tu mejor versión.");
  await expect
    .poll(() =>
      hero
        .locator(".sport-hero-visual img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    hero.getByRole("link", { name: "Conocé STYLO", includeHidden: true }),
  ).toHaveAttribute("href", "/nosotros");
  if (testInfo.project.name === "mobile") {
    await expect(hero.locator("video")).toHaveCount(0);
  }
  await hero.getByRole("link", { name: "Ver productos destacados" }).click();
  await expect(page).toHaveURL(/#categorias$/);
  await expect(
    page.getByRole("heading", { name: /Tu rutina empieza acá/ }),
  ).toBeVisible();
  await hero.getByRole("link", { name: "Explorar tienda" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("la mirada sigue la posición del cursor y vuelve al mismo fotograma", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "El celular muestra un fotograma fijo",
  );
  await page.goto("/");
  const video = page.locator(".sport-hero-visual > video");
  await expect(video).toHaveClass(/is-ready/, { timeout: 15000 });
  const width = page.viewportSize()!.width;
  const currentTime = () =>
    video.evaluate((element) => (element as HTMLVideoElement).currentTime);
  const duration = await video.evaluate(
    (element) => (element as HTMLVideoElement).duration,
  );
  await page.mouse.move(width * 0.1, 300);
  await expect.poll(currentTime).toBeGreaterThan(duration * 0.7);
  await page.mouse.move(width * 0.95, 300);
  await expect.poll(currentTime).toBeLessThan(duration * 0.3);
  // Absolute positioning must not drift after a quick reversal.
  await page.mouse.move(width * 0.15, 300);
  await page.mouse.move(width * 0.85, 300);
  await page.mouse.move(width * 0.7, 300);
  await expect.poll(currentTime).toBeCloseTo(duration / 2, 1);
  await expect(video).toHaveJSProperty("paused", true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveCount(0);
  await expect(page.locator(".hero-dust canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".sport-hero-visual > video")).toHaveClass(
    /is-ready/,
  );
  await expect(page.locator(".hero-dust canvas")).toBeVisible();
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-presentation",
    "static",
  );
});

test("movimiento reducido y navegación sin JavaScript conservan el hero", async ({
  page,
  browser,
}, testInfo) => {
  const atmosphereRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("stylo-scoop-intro"))
      atmosphereRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".sport-hero video")).toHaveCount(0);
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
  await expect(page.locator(".hero-typewriter")).toHaveText(
    "Potenciá tu mejor versión.",
  );
  expect(atmosphereRequests).toEqual([]);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  try {
    const plainPage = await context.newPage();
    await plainPage.goto(`${testInfo.project.use.baseURL}/`);
    await expect(plainPage.locator(".sport-hero video")).toHaveCount(0);
    await expect(plainPage.locator(".site-header")).toBeVisible();
    await expect(plainPage.locator(".site-header")).not.toHaveAttribute(
      "inert",
    );
    await expect(plainPage.locator(".category-navigation")).toBeVisible();
    await expect(plainPage.locator(".hero-typewriter")).toHaveText(
      "Potenciá tu mejor versión.",
    );
    await plainPage
      .locator(".sport-hero")
      .getByRole("link", { name: "Explorar tienda" })
      .click();
    await expect(plainPage).toHaveURL(/\/catalogo$/);
    await plainPage.locator(".site-header .brand-link").click();
    await expect(plainPage).toHaveURL(/\/#inicio$/);
    await expect.poll(() => plainPage.evaluate(() => scrollY)).toBeLessThan(2);
    await expect(plainPage.locator(".hero-actions a").first()).toBeVisible();
  } finally {
    await context.close();
  }
});

test("los renglones y botones esperan al león y conservan su orden", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.addInitScript(() => {
    const samples: { stage: number; time: number; buttons: string[] }[] = [];
    (
      window as typeof window & { contentSamples: typeof samples }
    ).contentSamples = samples;
    document.addEventListener("animationend", (event) => {
      if (event.animationName === "hero-lion-emerge")
        (window as typeof window & { lionEnd: number }).lionEnd =
          performance.now();
    });
    const observer = new MutationObserver(() => {
      const content = document.querySelector<HTMLElement>(".hero-content");
      const stage = Number(content?.dataset.contentStage);
      if (stage > 0 && samples.at(-1)?.stage !== stage)
        samples.push({
          stage,
          time: performance.now(),
          buttons: Array.from(
            content!.querySelectorAll<HTMLAnchorElement>(
              '.hero-actions a[data-revealed="true"]',
            ),
          ).map((link) => link.getAttribute("href")!),
        });
    });
    observer.observe(document, {
      attributes: true,
      attributeFilter: ["data-content-stage"],
      subtree: true,
    });
  });
  await page.goto("/");
  const content = page.locator(".hero-content");
  await expect(content).toHaveAttribute("data-content-stage", "6", {
    timeout: 15000,
  });
  const samples = await page.evaluate(
    () =>
      (
        window as typeof window & {
          contentSamples: { stage: number; time: number; buttons: string[] }[];
        }
      ).contentSamples,
  );
  expect(samples.map((sample) => sample.stage)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(samples[3].buttons).toEqual(["/nosotros"]);
  expect(samples[4].buttons).toEqual(["#categorias", "/nosotros"]);
  expect(samples[5].buttons).toEqual(["/catalogo", "#categorias", "/nosotros"]);
  // The sequence starts at the lion's actual animation end, rather than at
  // page load or while the scoop is still pouring.
  const lionEnd = await page.evaluate(
    () => (window as typeof window & { lionEnd: number }).lionEnd,
  );
  expect(lionEnd).toBeGreaterThan(0);
  const thresholds = [0, 800, 2000, 2800, 3200, 3600];
  for (const [index, sample] of samples.entries()) {
    expect(sample.time - lionEnd).toBeGreaterThanOrEqual(
      thresholds[index] - 80,
    );
    if (index > 0) expect(sample.time).toBeGreaterThan(samples[index - 1].time);
  }
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-navigation",
    "waiting",
  );
  for (const link of await content.locator(".hero-actions a").all()) {
    await expect(link).toHaveCSS("opacity", "1");
    await expect(link).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
  await expect(content.locator(".hero-cursor")).toHaveCount(0);
});

test("la presentación se muestra una vez por visita y el logo no la reinicia", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("stylo-scoop-intro"))
      requests.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.locator('.sport-hero[data-lion-visible="true"]'),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  await page.locator('.hero-actions a[href="/catalogo"]').click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await page.locator(".site-header .brand-link").click();
  await expect(page).toHaveURL(/\/#inicio$/);
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-presentation",
    "static",
  );
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-navigation",
    "ready",
  );
  await expect(page.locator(".hero-content")).toHaveAttribute(
    "data-content-stage",
    "6",
  );
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  await expect(page.locator(".site-header")).toHaveCSS("opacity", "1");
  await expect(page.locator(".site-header")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(page.locator(".sport-hero-visual")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-dust canvas")).toBeVisible();
  expect(requests).toHaveLength(1);
  // The tab remembers this visit even after a reload, without storing an
  // indefinite preference across future sessions.
  await page.reload();
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-presentation",
    "static",
  );
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  await expect(page.locator(".hero-dust canvas")).toBeVisible();
  expect(requests).toHaveLength(1);
});

test("el logo cancela una salida al catálogo que todavía está cargando", async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested: () => void = () => {};
  const requestStarted = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/catalogo*", async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.locator('.hero-actions a[href="/catalogo"]').click();
  await requestStarted;
  await page.locator(".site-header .brand-link").click();
  release();
  await expect(page).toHaveURL(/\/#inicio$/);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/#inicio$/);
  await expect(page.locator(".hero-content")).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
});

test("entrar directamente al catálogo no agrega una presentación al volver con el logo", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("stylo-scoop-intro"))
      requests.push(request.url());
  });
  await page.goto("/catalogo");
  await page.locator(".site-header .brand-link").click();
  await expect(page.locator(".sport-hero")).toHaveAttribute(
    "data-presentation",
    "static",
  );
  await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
  await expect(page.locator(".hero-content")).toHaveAttribute(
    "data-content-stage",
    "6",
  );
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  expect(requests).toEqual([]);
});

test("los logos vuelven al principio del hero desde otras páginas y desde el pie", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.locator('.hero-actions a[href="#categorias"]').click();
  await expect(page).toHaveURL(/#categorias$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await page.locator('#categorias a[href="/catalogo"]').click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await page.locator(".site-header .brand-link").click();
  await expect(page).toHaveURL(/\/#inicio$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  await expect(page.locator(".sport-hero")).toBeInViewport();
  await page.goto("/nosotros");
  await page.locator(".site-footer .brand-link").click();
  await expect(page).toHaveURL(/\/#inicio$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  await page.keyboard.press("Tab");
  await page.locator('.hero-actions a[href="#categorias"]').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await page.locator(".site-footer .brand-link").click();
  await expect(page).toHaveURL(/\/#inicio$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
});

test("polvo, silueta, león, contenido y navegación se encadenan sin mover el hero", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/");
  const hero = page.locator(".sport-hero");
  const intro = page.locator(".hero-atmosphere");
  await expect(intro).toHaveAttribute("data-phase", "playing", {
    timeout: 10000,
  });
  await expect(hero).toHaveAttribute("data-lion-visible", "false");
  await expect(hero.locator(".sport-hero-visual")).toHaveCSS("opacity", "0");
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".category-navigation-shell")).toHaveAttribute(
    "inert",
  );
  const initial = await hero.boundingBox();
  expect(initial!.y).toBe(0);
  await expect(page.locator('.hero-dust[data-visible="true"]')).toBeVisible();
  // The filmed powder, ambient dust and dim lion overlap. Copy and navigation
  // remain hidden throughout the scoop's lateral exit and the lion reveal.
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(intro).toHaveAttribute("data-phase", "leaving");
  const scoopPosition = () =>
    intro.locator("video").evaluate((element) => {
      const transform = new DOMMatrixReadOnly(
        getComputedStyle(element).transform,
      );
      return { x: transform.m41, scale: transform.a };
    });
  const exitStart = await scoopPosition();
  await expect
    .poll(async () => (await scoopPosition()).x)
    .toBeLessThan(exitStart.x - 30);
  expect((await scoopPosition()).scale).toBeCloseTo(exitStart.scale, 3);
  await expect(hero).toHaveAttribute("data-lion-visible", "true");
  await expect(hero.locator(".hero-content")).toHaveAttribute(
    "data-content-stage",
    "0",
  );
  await expect(hero.locator(".sport-hero-visual")).toHaveCSS(
    "animation-name",
    "hero-lion-emerge",
  );
  await expect(intro).toHaveCount(0, { timeout: 6000 });
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(hero.locator(".sport-hero-visual")).toHaveCSS(
    "animation-duration",
    "2.4s",
  );
  await expect(hero.locator(".sport-hero-visual")).toHaveCSS("opacity", "1");
  await expect(hero).toHaveAttribute("data-navigation", "waiting");
  await expect(hero).toHaveAttribute("data-navigation", "ready", {
    timeout: 6500,
  });
  await expect(page.locator(".site-header")).toHaveCSS("opacity", "1");
  await expect(page.locator(".category-navigation-shell")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.locator(".site-header")).not.toHaveAttribute("inert");
  await expect(page.locator(".site-header")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator(".category-navigation")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(
    page.getByText("STYLO SUPLEMENTOS · ROSARIO", { exact: true }),
  ).toHaveCount(0);
  expect(await hero.boundingBox()).toEqual(initial);
});

test("el scoop termina una vez y el polvo permanece con pausa accesible", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "La entrada es una mejora para escritorio",
  );
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("stylo-scoop-intro"))
      requests.push(request.url());
  });
  await page.goto("/");
  const intro = page.locator(".hero-atmosphere");
  await expect(intro).toHaveAttribute("data-phase", "playing", {
    timeout: 10000,
  });
  await expect(intro.locator("video")).toHaveJSProperty("muted", true);
  await expect(intro.locator("video")).toHaveJSProperty("loop", false);
  await expect(intro.locator("video")).toHaveJSProperty("paused", false);
  const lion = page.locator(".sport-hero-visual > video");
  await page.mouse.move(page.viewportSize()!.width * 0.1, 300);
  await expect
    .poll(() =>
      lion.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(2.8);
  await expect(intro).toHaveCount(0, { timeout: 6500 });
  const dust = page.locator(".hero-dust canvas");
  await expect(dust).toBeVisible();
  // A changing canvas can still look empty against black. Check the actual
  // composited luminance once the filmed powder has gone, not just the node.
  const visibleDust = await dust.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height).data;
    let bright = 0;
    let haze = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const onBlack = (pixels[i] * pixels[i + 3]) / 255;
      if (onBlack > 18) bright++;
      if (onBlack > 3) haze++;
    }
    return {
      bright: bright / (pixels.length / 4),
      haze: haze / (pixels.length / 4),
    };
  });
  expect(visibleDust.bright).toBeGreaterThan(0.01);
  expect(visibleDust.haze).toBeGreaterThan(0.15);
  const image = await dust.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  await expect
    .poll(() =>
      dust.evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(image);
  await page.getByRole("button", { name: "Pausar polvo del fondo" }).click();
  const pausedImage = await dust.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  await page.waitForTimeout(250);
  expect(
    await dust.evaluate((element) =>
      (element as HTMLCanvasElement).toDataURL(),
    ),
  ).toBe(pausedImage);
  await page
    .getByRole("button", { name: "Reanudar polvo del fondo" })
    .press("Space");
  await expect
    .poll(() =>
      dust.evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(pausedImage);
  await page.mouse.move(page.viewportSize()!.width * 0.95, 300);
  await expect
    .poll(() =>
      lion.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeLessThan(1.2);
  expect(requests).toHaveLength(1);
});

test("el cruce frontal sigue presentando fotogramas sin cambios de sentido", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "El seguimiento utiliza mouse");
  await page.goto("/");
  const video = page.locator(".sport-hero-visual > video");
  await expect(video).toHaveClass(/is-ready/);
  const width = page.viewportSize()!.width;
  await page.mouse.move(width * 0.6, 300);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(2.23, 1);
  await video.evaluate((element) => {
    const media = element as HTMLVideoElement & { presented: number[] };
    media.presented = [];
    media.addEventListener("seeked", () =>
      media.presented.push(media.currentTime),
    );
  });
  for (let step = 1; step <= 40; step++) {
    await page.mouse.move(width * (0.6 + step * 0.005), 300);
    await page.waitForTimeout(35);
  }
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeLessThan(1.65);
  const frames = await video.evaluate(
    (element) =>
      (element as HTMLVideoElement & { presented: number[] }).presented,
  );
  // Parallel browser load may coalesce destinations; the frontal pose must
  // still be presented between the two sides, rather than skipped.
  expect(frames.some((time) => Math.abs(time - 2.02) < 0.07)).toBe(true);
  for (let i = 1; i < frames.length; i++) {
    expect(frames[i]).toBeLessThanOrEqual(frames[i - 1] + 0.001);
    expect(frames[i - 1] - frames[i]).toBeLessThan(0.2);
  }
});

test("la mirada lenta atraviesa el frente con poses intermedias", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "El seguimiento utiliza mouse");
  await page.goto("/");
  const video = page.locator(".sport-hero-visual > video");
  await expect(video).toHaveClass(/is-ready/);
  const width = page.viewportSize()!.width;
  await page.mouse.move(width * 0.67, 300);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(2.05);
  await page.waitForTimeout(400);
  await video.evaluate((element) => {
    const media = element as HTMLVideoElement & { slowFrames: number[] };
    media.slowFrames = [];
    media.addEventListener("seeked", () =>
      media.slowFrames.push(media.currentTime),
    );
  });
  // Just six percent of the viewport over almost six seconds: the previous
  // 24 fps clip held only five poses during this same slow central sweep.
  for (let step = 1; step <= 160; step++) {
    await page.mouse.move(width * (0.67 + step * 0.000375), 300);
    await page.waitForTimeout(35);
  }
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeLessThan(1.91);
  const frames = await video.evaluate(
    (element) =>
      (element as HTMLVideoElement & { slowFrames: number[] }).slowFrames,
  );
  expect(new Set(frames).size).toBeGreaterThan(12);
  for (let i = 1; i < frames.length; i++) {
    expect(frames[i]).toBeLessThanOrEqual(frames[i - 1] + 0.001);
    expect(frames[i - 1] - frames[i]).toBeLessThan(0.032);
  }
  await page.mouse.move(width * 0.7, 300);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeCloseTo(2, 1);
});

test("un fallo del fondo conserva el león y los accesos de compra", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "El celular no descarga el video decorativo",
  );
  await page.route("**/stylo-scoop-intro-v1.mp4", (route) => route.abort());
  const attempted = page.waitForRequest("**/stylo-scoop-intro-v1.mp4");
  await page.goto("/");
  await attempted;
  await expect(page.locator(".hero-atmosphere")).toHaveCount(0);
  await expect(page.locator(".sport-hero-visual > video")).toHaveClass(
    /is-ready/,
  );
  await page
    .getByRole("link", { name: "Explorar tienda", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalogo$/);
});
