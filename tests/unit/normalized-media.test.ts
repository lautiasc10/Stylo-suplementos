import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { normalizedPhotoProps } from "../../src/modules/catalog/normalized-media";
import registry from "../../src/modules/catalog/normalized-images.json";
import onefit from "../../src/modules/catalog/renormalized-images.json";
import sharp from "sharp";

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
    expect(result.src).toBe(derivative.replace("-1000.webp", "-640.webp"));
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

describe("renormalización One Fit: originales nuevos sin alterar el catálogo", () => {
  const imageBase =
    "https://example.test/storage/v1/object/public/product-media";
  const report = JSON.parse(
    readFileSync("public/media/onefit-normalized-v1/report.json", "utf8"),
  ) as {
    records: {
      sourcePath: string;
      variantId: string;
      outputs: Record<string, { filename: string; bytes: number }>;
    }[];
  };

  it("sirve 320/600/1000 para las ocho fotos y respeta reemplazos y vistas previas", () => {
    expect(Object.keys(onefit)).toHaveLength(8);
    expect(report.records).toHaveLength(8);
    for (const [path, master] of Object.entries(onefit)) {
      const original = { path, imageBase };
      const card = normalizedPhotoProps(
        `${imageBase}/${path}`,
        "card",
        original,
      );
      expect(card.src).toBe(master.replace("-1000.webp", "-600.webp"));
      expect(card.srcSet).toContain("600w");
      expect(card.srcSet).not.toContain("640w");
      expect(
        normalizedPhotoProps(`${imageBase}/${path}`, "detail", original).src,
      ).toBe(master);
      expect(
        normalizedPhotoProps("blob:replacement", "detail", original),
      ).toEqual({});
      expect(
        normalizedPhotoProps(
          `${imageBase}/${path}?replacement=1`,
          "card",
          original,
        ),
      ).toEqual({});
      for (const size of [320, 600, 1000])
        expect(
          existsSync(`public${master.replace("-1000.webp", `-${size}.webp`)}`),
        ).toBe(true);
    }
    // No se asigna la foto de Chocolate al SKU de Dulce de leche sin imagen.
    expect(
      report.records.some(
        (r) => r.variantId === "baa2445c-aa97-4cbd-b020-231f40bf5464",
      ),
    ).toBe(false);
    expect(
      report.records.some(
        (r) => r.variantId === "3eb37c89-a023-4ab1-98e0-168940b95ddc",
      ),
    ).toBe(true);
  });

  it("todos los WebP conservan transparencia, altura y base común, sin PNG pesado en cards", async () => {
    for (const record of report.records) {
      for (const size of [320, 600, 1000]) {
        const file = `public/media/onefit-normalized-v1/${record.outputs[size].filename}`;
        const metadata = await sharp(file).metadata();
        expect([
          metadata.width,
          metadata.height,
          metadata.format,
          metadata.hasAlpha,
        ]).toEqual([size, size, "webp", true]);
        const { data, info } = await sharp(file)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        expect(data[3]).toBe(0);
        expect(data[data.length - 1]).toBe(0);
        let top = size,
          bottom = -1;
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++)
            if (data[(y * size + x) * info.channels + 3] > 24) {
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        expect(Math.abs(top - size * 0.1)).toBeLessThanOrEqual(1);
        expect(Math.abs(bottom + 1 - size * 0.9)).toBeLessThanOrEqual(1);
        if (size === 600)
          expect(record.outputs[size].bytes).toBeLessThan(60000);
      }
    }
  });
});
