import { afterEach, describe, expect, it, vi } from "vitest";
import { createGalleryPhotoCache } from "../../src/components/catalog/gallery-photo-cache";

class Photo {
  static instances: Photo[] = [];
  src = "";
  srcset = "";
  sizes = "";
  crossOrigin = "";
  decoding = "";
  fetchPriority = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decode = vi.fn(() => Promise.resolve());
  constructor() {
    Photo.instances.push(this);
  }
}
afterEach(() => {
  Photo.instances = [];
  vi.unstubAllGlobals();
});

describe("caché de fotografías del giro", () => {
  it("comparte precarga y clic, espera decode y limita fotografías decodificadas", async () => {
    vi.stubGlobal("Image", Photo);
    const cache = createGalleryPhotoCache();
    const first = cache.load("front", "low", {
      srcSet: "front-640 640w",
      sizes: "50vw",
    });
    const same = cache.load("front", "high");
    expect(same).toBe(first);
    const image = Photo.instances[0];
    expect(image.fetchPriority).toBe("high");
    expect(image.srcset).toBe("front-640 640w");
    let decoded!: () => void;
    image.decode.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          decoded = resolve;
        }),
    );
    image.onload?.();
    expect(cache.has("front")).toBe(false);
    decoded();
    await first;
    expect(cache.has("front")).toBe(true);
    for (let i = 0; i < 4; i++) {
      const task = cache.load(`neighbor-${i}`);
      Photo.instances.at(-1)!.onload?.();
      await task;
    }
    expect(cache.has("front")).toBe(false);
    expect(cache.has("neighbor-3")).toBe(true);
    cache.dispose();
  });
  it("libera vecinos al salir de pantalla y cancela descargas, permitiendo volver a cargar", async () => {
    vi.stubGlobal("Image", Photo);
    const cache = createGalleryPhotoCache();
    const ready = cache.load("ready");
    Photo.instances.at(-1)!.onload?.();
    await ready;
    const pending = cache.load("slow");
    const cancelled = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    cache.release();
    await cancelled;
    expect(cache.has("ready")).toBe(false);
    const retry = cache.load("ready");
    Photo.instances.at(-1)!.onload?.();
    await retry;
    expect(cache.has("ready")).toBe(true);
    cache.dispose();
    await expect(cache.load("another")).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
