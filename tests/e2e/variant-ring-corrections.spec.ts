import { test, expect } from "@playwright/test";
import { seed, detail } from "./variant-ring-fixture";

for (const size of ["compact", "full"] as const) {
  test(`${size}: diez clics rápidos en ambos sentidos sin montar, desmontar ni cambiar fuentes durante el giro`, async ({
    page,
  }) => {
    const { product } = await seed(page, false, false, 8);
    await page.goto(size === "compact" ? "/vista-previa" : detail);
    const ring = page.locator(`.variant-ring-${size}`);
    await ring.scrollIntoViewIfNeeded();
    await ring
      .getByRole("button", { name: "Sabor siguiente", exact: true })
      .focus();
    await ring.evaluate((root) => {
      const frames = root.querySelector(".variant-ring-frames")!;
      const nodes = [...frames.querySelectorAll(".variant-ring-item")];
      Object.assign(window, {
        stableRing: {
          nodes,
          added: 0,
          removed: 0,
          changedSourceDuringAnimation: 0,
        },
      });
      const result = (
        window as unknown as {
          stableRing: {
            added: number;
            removed: number;
            changedSourceDuringAnimation: number;
          };
        }
      ).stableRing;
      new MutationObserver((changes) => {
        for (const change of changes) {
          result.added += change.addedNodes.length;
          result.removed += change.removedNodes.length;
          if (
            ["rotating", "fading"].includes(
              (root as HTMLElement).dataset.ringPhase!,
            ) &&
            ["src", "srcset"].includes(change.attributeName ?? "")
          )
            result.changedSourceDuringAnimation++;
        }
      }).observe(frames, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset"],
      });
    });
    for (const [name, expected] of [
      ["Sabor siguiente", 2],
      ["Sabor anterior", 0],
    ] as const) {
      for (let i = 0; i < 10; i++) {
        await ring
          .getByRole("button", { name, exact: true })
          .dispatchEvent("click");
        await page.waitForTimeout(25);
      }
      await expect(ring).toHaveAttribute(
        "data-active-variant",
        product.variants[expected].id,
      );
      await expect(ring).toHaveAttribute("data-ring-phase", "idle");
      await expect(ring.locator(".variant-ring-count")).toHaveText(
        `${expected + 1}/8`,
      );
      await expect(ring.locator("[data-current=true]")).toHaveCSS(
        "opacity",
        "1",
      );
      expect(
        await ring
          .locator(".variant-ring-item")
          .evaluateAll((items) =>
            items.every((item) => !item.style.willChange),
          ),
      ).toBe(true);
      if (size === "full")
        await expect(page).toHaveURL(new RegExp(product.variants[expected].id));
    }
    const stability = await ring.evaluate((root) => {
      const result = (
        window as unknown as {
          stableRing: {
            nodes: Element[];
            added: number;
            removed: number;
            changedSourceDuringAnimation: number;
          };
        }
      ).stableRing;
      return {
        sameNodes: result.nodes.every((node) => root.contains(node)),
        added: result.added,
        removed: result.removed,
        changedSourceDuringAnimation: result.changedSourceDuringAnimation,
      };
    });
    expect(stability).toEqual({
      sameNodes: true,
      added: 0,
      removed: 0,
      changedSourceDuringAnimation: 0,
    });
  });
}

test("última a primera: vecina que cruza oculta, tilt exclusivo del activo y máscara estática", async ({
  page,
}) => {
  const { product } = await seed(page, false, false, 3);
  await page.goto(detail);
  const ring = page.locator(".variant-ring-full");
  await ring.scrollIntoViewIfNeeded();
  await ring
    .getByRole("button", { name: "Sabor anterior", exact: true })
    .click();
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[2].id,
  );
  await ring
    .getByRole("button", { name: "Sabor siguiente", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-ring-phase", "rotating");
  const midpoint = await ring.evaluate(async (root) => {
    const items = [...root.querySelectorAll<HTMLElement>(".variant-ring-item")];
    for (const item of items)
      for (const animation of item.getAnimations()) {
        animation.pause();
        // The shared ease-out reaches the spatial center early (~100 ms).
        // At half the duration it is already beside the active pack again.
        animation.currentTime = 100;
      }
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    return items
      .filter((item) => +item.dataset.from! * +item.dataset.to! < 0)
      .map((item) => ({
        opacity: +getComputedStyle(item).opacity,
        transform: getComputedStyle(item.querySelector(".variant-ring-tilt")!)
          .transform,
      }));
  });
  expect(midpoint.length).toBeGreaterThan(0);
  expect(
    midpoint.every((item) => item.opacity === 0),
    JSON.stringify(midpoint),
  ).toBe(true);
  await ring.evaluate((root) =>
    root
      .querySelectorAll("*")
      .forEach((item) => item.getAnimations().forEach((a) => a.finish())),
  );
  await expect(ring).toHaveAttribute(
    "data-active-variant",
    product.variants[0].id,
  );
  await expect(ring.locator(".variant-ring-frames")).toHaveCSS(
    "overflow",
    "hidden",
  );
  expect(
    await ring
      .locator(".variant-ring-frames")
      .evaluate((e) => getComputedStyle(e).maskImage),
  ).toContain("linear-gradient");
  const stage = ring.locator(".product-image-stage");
  const box = (await stage.boundingBox())!;
  await stage.dispatchEvent("pointermove", {
    pointerType: "mouse",
    clientX: box.x + box.width * 0.85,
    clientY: box.y + box.height * 0.25,
  });
  await expect(stage).toHaveAttribute("data-tilting", "true");
  const neighbors = await ring
    .locator(".variant-ring-item[data-visible=true]:not([data-current=true])")
    .evaluateAll((items) =>
      items.map((item) => ({
        opacity: +getComputedStyle(item).opacity,
        filter: getComputedStyle(item).filter,
        tilt: getComputedStyle(item.querySelector(".variant-ring-tilt")!)
          .transform,
        blend: getComputedStyle(item.querySelector(".variant-ring-light")!)
          .mixBlendMode,
      })),
    );
  expect(neighbors).toHaveLength(2);
  expect(
    neighbors.every(
      (n) =>
        Math.abs(n.opacity - 0.3) < 0.001 &&
        n.filter === "none" &&
        n.tilt === "none" &&
        n.blend === "normal",
    ),
  ).toBe(true);
  await page.waitForTimeout(200);
  await expect(
    ring.locator(".variant-ring-item[data-current=true] .variant-ring-tilt"),
  ).toHaveCSS("will-change", "auto");
});
