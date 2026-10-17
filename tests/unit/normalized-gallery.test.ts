import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import registry from "../../src/modules/catalog/normalized-gallery.json";
import { normalizedPhotoProps } from "../../src/modules/catalog/normalized-media";

describe("galería normalizada Fase 3D", () => {
  const report = JSON.parse(
    readFileSync("public/media/products-normalized-v2/report.json", "utf8"),
  );
  it("cubre todos los frentes, costados y documentos, conservando los originales y una base común", () => {
    expect(Object.keys(registry)).toHaveLength(115);
    expect(
      report.records.filter((r: { kind: string }) => r.kind === "images"),
    ).toHaveLength(56);
    expect(
      report.records.filter((r: { kind: string }) => r.kind === "turnImages"),
    ).toHaveLength(8);
    expect(
      report.records.filter(
        (r: { kind: string }) => r.kind === "informationImages",
      ),
    ).toHaveLength(51);
    for (const r of report.records) {
      if (r.kind !== "informationImages") {
        expect(r.placement.baseline).toBe(900);
        expect(r.placement.height).toBe(800);
        expect(r.originalTransparent).toBe(true);
      }
      for (const size of [320, 600, 1000]) {
        const output = r.outputs[size];
        const file = `public/media/products-normalized-v2/${output.filename}`;
        expect(existsSync(file)).toBe(true);
        expect(statSync(file).size).toBe(output.bytes);
        if (size === 600) expect(output.bytes).toBeLessThanOrEqual(60000);
      }
    }
  });
  it("las tarjetas excluyen el master de 1000 y los recortes rechazados están enmarcados", () => {
    const base = "https://example.test/storage/v1/object/public/product-media";
    for (const [path, entry] of Object.entries(registry)) {
      const card = normalizedPhotoProps(`${base}/${path}`, "card", {
        path,
        imageBase: base,
      });
      expect(card.src).toContain("-600.webp");
      expect(card.srcSet).not.toContain("-1000.webp");
      const detail = normalizedPhotoProps(`${base}/${path}`, "detail", {
        path,
        imageBase: base,
      });
      expect(detail.src).toBe(entry.src);
    }
    for (const r of report.records.filter((r: { status: string }) =>
      r.status.includes("failed"),
    )) {
      expect(r.framed).toBe(true);
      expect(
        (registry as Record<string, { framed: boolean }>)[r.sourcePath].framed,
      ).toBe(true);
    }
  });
});
