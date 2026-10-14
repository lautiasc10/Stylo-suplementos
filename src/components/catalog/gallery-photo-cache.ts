// Each mounted gallery retains at most four decoded photographs. Pending loads
// are shared by warming and explicit navigation, so a click does not fetch twice.
export function createGalleryPhotoCache() {
  const ready = new Map<string, HTMLImageElement>();
  const pending = new Map<string, Promise<HTMLImageElement>>();
  let disposed = false;
  const remember = (src: string, image: HTMLImageElement) => {
    if (disposed) return;
    ready.delete(src);
    ready.set(src, image);
    if (ready.size > 4) ready.delete(ready.keys().next().value!);
  };
  const load = (src: string): Promise<HTMLImageElement> => {
    const existing = ready.get(src);
    if (existing) return Promise.resolve(existing);
    const inflight = pending.get(src);
    if (inflight) return inflight;
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = async () => {
        try {
          await image.decode();
          remember(src, image);
          resolve(image);
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error("Photograph could not be loaded"));
      image.src = src;
    }).finally(() => pending.delete(src));
    pending.set(src, promise);
    return promise;
  };
  return {
    load,
    has: (src: string) => ready.has(src),
    remember,
    dispose: () => {
      disposed = true;
      ready.clear();
      pending.clear();
    },
  };
}
