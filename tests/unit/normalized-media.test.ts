import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { normalizedPhotoProps } from "../../src/modules/catalog/normalized-media";
import registry from "../../src/modules/catalog/normalized-images.json";
import gallery from "../../src/modules/catalog/normalized-gallery.json";

describe("fotografías normalizadas del catálogo", () => {
  const [original, derivative] = Object.entries(registry)[0];
  const imageBase =
    "https://example.test/storage/v1/object/public/product-media";
  it("selecciona derivados responsive solo para la ruta original exacta", () => {
    const result = normalizedPhotoProps(`${imageBase}/${original}`, "card", {
      path: original,
      imageBase,
    });
    expect(result.normalized).toBe(true);
    const updated = (gallery as Record<string, { src: string }>)[original]?.src;
    expect(result.src).toBe(
      (updated || derivative).replace(
        "-1000.webp",
        updated ? "-600.webp" : "-640.webp",
      ),
    );
    expect(result.srcSet).toContain("320w");
    expect(
      normalizedPhotoProps("data:image/png;base64,preview", "card", {
        path: original,
        imageBase,
      }),
    ).toEqual({});
    expect(
      normalizedPhotoProps(`${imageBase}/new-photo.webp`, "detail", {
        path: "new-photo.webp",
        imageBase,
      }),
    ).toEqual({});
  });
  it("mantiene las fotos anteriores del comparador y comprueba todos los derivados", () => {
    expect(
      normalizedPhotoProps(
        "/media/normalization-trial-v1/before/example.webp",
        "card",
        { path: original, imageBase },
      ),
    ).toEqual({});
    expect(Object.keys(registry)).toHaveLength(64);
    for (const master of Object.values(registry)) {
      for (const size of [320, 640, 1000])
        expect(
          existsSync(`public${master.replace("-1000.webp", `-${size}.webp`)}`),
        ).toBe(true);
    }
    const report = JSON.parse(
      readFileSync("public/media/products-normalized-v1/report.json", "utf8"),
    );
    expect(report.records).toHaveLength(64);
    expect(
      report.records.filter(
        (record: { status: string }) => record.status === "manual-review",
      ),
    ).toHaveLength(0);
  });
});
