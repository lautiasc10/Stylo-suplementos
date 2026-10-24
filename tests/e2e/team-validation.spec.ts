import { test, expect } from "@playwright/test";

test("el título del Team cabe completo en pantallas de 320 y 375px", async ({ page }) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#atletas");
    await page.evaluate(() => document.fonts.ready);
    const fits = await page.locator("#athlete-title .reference-text-gold").evaluate((word) => {
      const bounds = word.closest(".home-athlete-copy")!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(word);
      const text = range.getBoundingClientRect();
      return text.left >= bounds.left - 1 && text.right <= bounds.right + 1;
    });
    expect(fits).toBe(true);
  }
});

test("un fallo de guardado conserva los datos de la consulta y no anuncia éxito", async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "stylo.team-applications-preview.v1") throw new DOMException("Quota exceeded", "QuotaExceededError");
      return set.call(this, key, value);
    };
  });
  await page.goto("/vista-previa/portada#atletas");
  const form = page.locator(".home-team-form");
  await form.getByLabel("Nombre y apellido").fill("Persona de prueba");
  await form.getByLabel("Email", { exact: true }).fill("fallo@example.com");
  await form.getByLabel("Disciplina o actividad").fill("Atletismo");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Enviar consulta al Team" }).click();
  await expect(form.getByRole("alert")).toContainText("No pudimos guardar");
  await expect(form.getByLabel("Nombre y apellido")).toHaveValue("Persona de prueba");
  await expect(form.getByLabel("Email", { exact: true })).toHaveValue("fallo@example.com");
  await expect(form.getByRole("checkbox")).toBeChecked();
  await expect(page.locator(".home-team-confirmation")).toHaveCount(0);
});

test("el panel muestra mensajes como texto y no convierte perfiles arbitrarios en enlaces", async ({ page }) => {
  await page.addInitScript(() => {
    const now = "2026-10-24T12:00:00.000Z";
    localStorage.setItem("stylo.team-applications-preview.v1", JSON.stringify([{
      id: "00000000-0000-4000-8000-000000000920", created_at: now, updated_at: now,
      kind: "athlete", name: "Prueba de texto", email: "texto@example.com", discipline: "Gym",
      instagram: "javascript:alert(1)", message: "<img src=x onerror=alert(1)>", status: "new", notes: "",
    }]));
  });
  await page.goto("/vista-previa/atletas");
  const row = page.locator(".team-inbox-item");
  await row.locator("summary").click();
  await expect(row.locator(".team-inbox-message")).toHaveText("<img src=x onerror=alert(1)>");
  await expect(row.locator(".team-inbox-message img")).toHaveCount(0);
  await expect(row.locator('a[href^="javascript:"]')).toHaveCount(0);
});
