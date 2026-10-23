import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import updates from "../../src/modules/catalog/updated-images.json";
import documents from "../../src/modules/catalog/information-images.json";
import {
  normalizedPhotoProps,
  informationMediaSource,
} from "../../src/modules/catalog/normalized-media";

const imageBase = "https://example.test/storage/v1/object/public/product-media";

describe("fotos corregidas desde Drive", () => {
  it("usa los derivados para cada ruta exacta y permite reemplazos posteriores", () => {
    for (const [path, master] of Object.entries(updates)) {
      const registered = { path, imageBase };
      const result = normalizedPhotoProps(
        `${imageBase}/${path}`,
        "card",
        registered,
      );
      const size = master.includes("catalog-normalized-v2") ? 600 : 640;
      expect(result.src).toBe(master.replace("-1000.webp", `-${size}.webp`));
      expect(
        normalizedPhotoProps("blob:new-upload", "card", registered),
      ).toEqual({});
      expect(
        normalizedPhotoProps(`${imageBase}/new-file.webp`, "card", registered),
      ).toEqual({});
    }
  });

  it("mantiene transparencia, dimensiones, altura y base de los envases nuevos", async () => {
    const masters = [...new Set(Object.values(updates))].filter((path) =>
      path.includes("catalog-normalized-v2"),
    );
    for (const master of masters) {
      for (const size of [320, 600, 1000]) {
        const file = `public${master.replace("-1000.webp", `-${size}.webp`)}`;
        const metadata = await sharp(file).metadata();
        expect([
          metadata.width,
          metadata.height,
          metadata.format,
          metadata.hasAlpha,
        ]).toEqual([size, size, "webp", true]);
        if (size === 600) expect(readFileSync(file).length).toBeLessThan(60000);
      }
      const { data, info } = await sharp(`public${master}`)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let top = 1000,
        bottom = -1;
      for (let y = 0; y < 1000; y++)
        for (let x = 0; x < 1000; x++) {
          if (data[(y * info.width + x) * info.channels + 3] > 24) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      expect(Math.abs(top - 100)).toBeLessThanOrEqual(1);
      expect(Math.abs(bottom + 1 - 900)).toBeLessThanOrEqual(1);
    }
  });

  it("optimiza las fichas sin sustituir archivos de vista previa ni originales nuevos", async () => {
    for (const [path, optimized] of Object.entries(documents)) {
      expect(existsSync(`public${optimized}`)).toBe(true);
      expect(
        informationMediaSource(`${imageBase}/${path}`, imageBase, path),
      ).toBe(optimized);
      expect(
        informationMediaSource(
          "data:image/png;base64,preview",
          imageBase,
          path,
        ),
      ).toContain("data:");
      expect(
        informationMediaSource(
          `${imageBase}/replacement.webp`,
          imageBase,
          path,
        ),
      ).toBe(`${imageBase}/replacement.webp`);
      const metadata = await sharp(`public${optimized}`).metadata();
      expect(Math.max(metadata.width!, metadata.height!)).toBeLessThanOrEqual(
        1000,
      );
    }
  });
});
