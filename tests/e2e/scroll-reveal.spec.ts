import { expect, test } from "@playwright/test";

test("HTML sin JavaScript y JavaScript demorado conservan títulos y pie visibles", async ({
  page,
  browser,
}, info) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.locator("#destacados h2")).toHaveText(
      "Productos destacados",
    );
    await expect(page.locator(".site-footer")).toHaveCSS("opacity", "1");
    await expect(page.locator(".home-section-heading").first()).toHaveCSS(
      "opacity",
      "1",
    );
  } finally {
    release();
  }
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: info.project.use.viewport,
  });
  try {
    const plain = await context.newPage();
    await plain.goto(`${info.project.use.baseURL}/`);
    await expect(plain.locator(".site-footer")).toHaveCSS("opacity", "1");
    await expect(plain.locator(".home-section-heading").first()).toHaveCSS(
      "opacity",
      "1",
    );
    await plain
      .getByRole("link", { name: "Explorar tienda", exact: true })
      .first()
      .click();
    await expect(plain).toHaveURL(/\/catalogo$/);
  } finally {
    await context.close();
  }
});

test("revela una sola vez y el foco por teclado muestra el pie inmediatamente", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  const heading = page.locator("#destacados .home-section-heading");
  await expect(heading).toHaveAttribute("data-reveal", "pending");
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute("data-reveal", "visible");
  await expect(heading).toHaveCSS("opacity", "1");
  const title = heading.locator("h2");
  await expect
    .poll(() => title.evaluate((e) => getComputedStyle(e, "::after").transform))
    .toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute("data-reveal", "visible");
  await expect(heading).toHaveCSS("transform", "none");
  const footer = page.locator(".site-footer");
  await footer
    .getByRole("link", { name: "Stylo Suplementos", exact: true })
    .focus();
  await expect(footer).toHaveCSS("opacity", "1");
  await expect(footer).toHaveAttribute("data-reveal", "visible");
});

test("movimiento reducido en vivo elimina ocultación y animaciones pendientes", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  const footer = page.locator(".site-footer");
  await expect(footer).toHaveAttribute("data-reveal", "pending");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(footer).toHaveAttribute("data-reveal", "visible");
  await expect(footer).toHaveCSS("opacity", "1");
  await expect(footer).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(footer).toHaveAttribute("data-reveal", "visible");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
