import { beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
import { prepareCatalogImage } from "../../src/modules/catalog/prepare-image";
import { imageProfile } from "../../src/modules/catalog/image-profile";
import { normalizedPhotoProps } from "../../src/modules/catalog/normalized-media";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("../../src/modules/admin/access", () => ({
  requireAdmin: mocks.access,
}));
import { uploadCatalogImage } from "../../src/modules/catalog/actions";

const productId = "11111111-1111-4111-8111-111111111111";
async function photo() {
  const product = await sharp({
    create: { width: 500, height: 1000, channels: 4, background: "white" },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 1200, height: 1400, channels: 4, background: "#00000000" },
  })
    .composite([{ input: product, left: 470, top: 230 }])
    .png()
    .toBuffer();
}
const file = (data: Uint8Array) =>
  new File([new Uint8Array(data)], "foto.png", { type: "image/png" });
async function form() {
  const data = new FormData();
  data.set("file", file(await photo()));
  data.set("productId", productId);
  data.set("purpose", "product");
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({
    client: { rpc: mocks.rpc, storage: { from: mocks.from } },
  });
  mocks.rpc.mockResolvedValue({
    data: { normalizedUploads: true },
    error: null,
  });
  mocks.from.mockReturnValue({ upload: mocks.upload, remove: mocks.remove });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});

it("conserva el original y centra un envase blanco sin borrar su etiqueta", async () => {
  const source = await photo();
  const result = await prepareCatalogImage(file(source), productId, "product");
  expect(result.files).toHaveLength(4);
  expect(result.files[0].bytes.equals(source)).toBe(true);
  expect(imageProfile(result.path)?.originalPath).toBe(result.files[0].path);
  for (const size of [320, 600, 1000]) {
    const copy = result.files.find((item) =>
      item.path.endsWith(`-${size}.webp`),
    )!;
    const meta = await sharp(copy.bytes).metadata();
    expect([meta.width, meta.height, meta.format, meta.hasAlpha]).toEqual([
      size,
      size,
      "webp",
      true,
    ]);
    const { data } = await sharp(copy.bytes)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let top = size,
      bottom = 0;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (data[(y * size + x) * 4 + 3] >= 32) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y + 1);
        }
    expect(Math.abs(top - size * 0.1)).toBeLessThanOrEqual(1);
    expect(Math.abs(bottom - size * 0.9)).toBeLessThanOrEqual(1);
    expect(
      data[(Math.floor(size / 2) * size + Math.floor(size / 2)) * 4],
    ).toBeGreaterThan(240);
    if (size <= 600) expect(copy.bytes.length).toBeLessThanOrEqual(60000);
  }
  const imageBase =
    "https://example.test/storage/v1/object/public/product-media";
  const props = normalizedPhotoProps(`${imageBase}/${result.path}`, "card", {
    path: result.path,
    imageBase,
  });
  expect(props.src).toMatch(/-600\.webp$/);
  expect(props.srcSet).toContain("320w");
  expect(
    normalizedPhotoProps("blob:preview", "card", {
      path: result.path,
      imageBase,
    }).normalized,
  ).toBe(true);
  expect(
    normalizedPhotoProps(`${imageBase}/otra.png`, "card", {
      path: result.path,
      imageBase,
    }),
  ).toEqual({});
});

it("las fichas conservan el fondo y proporción; los logos mantienen sus bytes", async () => {
  const source = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const info = await prepareCatalogImage(
    file(source),
    productId,
    "information",
  );
  expect(info.files).toHaveLength(2);
  const meta = await sharp(info.files[1].bytes).metadata();
  expect([meta.width, meta.height]).toEqual([1000, 750]);
  expect(imageProfile(info.path)?.kind).toBe("information");
  const brand = await prepareCatalogImage(file(source), productId, "brand");
  expect(brand.files).toHaveLength(1);
  expect(brand.files[0].bytes.equals(source)).toBe(true);
  await expect(
    prepareCatalogImage(file(source), productId, "product"),
  ).rejects.toThrow(/transparente/);
});

it("rechaza archivos corruptos, fuentes enormes y envases cortados antes de subir", async () => {
  const corrupt = file(
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
  );
  await expect(
    prepareCatalogImage(corrupt, productId, "product"),
  ).rejects.toThrow();
  const huge = await sharp({
    create: { width: 16001, height: 1000, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await expect(
    prepareCatalogImage(file(huge), productId, "information"),
  ).rejects.toThrow();
  const clipped = await sharp({
    create: { width: 600, height: 1000, channels: 4, background: "#00000000" },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 300,
            height: 1000,
            channels: 4,
            background: "white",
          },
        })
          .png()
          .toBuffer(),
        left: 150,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  await expect(
    prepareCatalogImage(file(clipped), productId, "product"),
  ).rejects.toThrow(/borde/);
});

it("requiere administración y migración antes de escribir en Storage", async () => {
  const input = await form();
  mocks.access.mockRejectedValueOnce(new Error("MFA"));
  await expect(uploadCatalogImage(input)).rejects.toThrow("MFA");
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
  expect((await uploadCatalogImage(input)).error).toMatch(/migración/);
  expect(mocks.upload).not.toHaveBeenCalled();
});

it("sube el conjunto completo y limpia solo los objetos de un intento fallido", async () => {
  const input = await form();
  mocks.upload
    .mockResolvedValueOnce({ error: null })
    .mockResolvedValueOnce({ error: { message: "storage" } });
  expect((await uploadCatalogImage(input)).error).toMatch(
    /anterior se conserva/,
  );
  expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  mocks.upload.mockClear();
  mocks.remove.mockClear();
  const result = await uploadCatalogImage(input);
  expect(result.path).toMatch(/-normalized-v1-png-1000\.webp$/);
  expect(mocks.upload).toHaveBeenCalledTimes(4);
  expect(mocks.remove).not.toHaveBeenCalled();
  for (const call of mocks.upload.mock.calls)
    expect(call[2]).toMatchObject({ upsert: false, cacheControl: "31536000" });
}, 15000);
