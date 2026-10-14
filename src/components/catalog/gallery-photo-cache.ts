// Each mounted gallery retains at most four decoded photographs. Pending loads
// are shared by warming and explicit navigation, so a click does not fetch twice.
export function createGalleryPhotoCache() {
  const ready = new Map<string, HTMLImageElement>();
  const pending = new Map<
    string,
    {
      image: HTMLImageElement;
      task: Promise<HTMLImageElement>;
      cancel: () => void;
    }
  >();
  let disposed = false;
  const cancelPending = () => {
    for (const entry of pending.values()) entry.cancel();
    pending.clear();
  };
  const remember = (src: string, image: HTMLImageElement) => {
    if (disposed) return;
    ready.delete(src);
    ready.set(src, image);
    if (ready.size > 4) ready.delete(ready.keys().next().value!);
  };
  const load = (
    src: string,
    priority: "high" | "low" = "high",
  ): Promise<HTMLImageElement> => {
    if (disposed)
      return Promise.reject(new DOMException("Gallery disposed", "AbortError"));
    const existing = ready.get(src);
    if (existing) return Promise.resolve(existing);
    const inflight = pending.get(src);
    if (inflight) {
      if (priority === "high") inflight.image.fetchPriority = "high";
      return inflight.task;
    }
    const image = new Image();
    let cancelled = false;
    let cancel = () => {};
    image.fetchPriority = priority;
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      cancel = () => {
        cancelled = true;
        image.onload = null;
        image.onerror = null;
        image.src = "";
        reject(new DOMException("Photograph cancelled", "AbortError"));
      };
      image.onload = async () => {
        try {
          await image.decode();
          if (cancelled || disposed) return;
          remember(src, image);
          resolve(image);
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error("Photograph could not be loaded"));
      image.src = src;
    }).finally(() => {
      if (pending.get(src)?.task === promise) pending.delete(src);
    });
    pending.set(src, { image, task: promise, cancel });
    return promise;
  };
  return {
    load,
    has: (src: string) => ready.has(src),
    remember,
    cancelPending,
    dispose: () => {
      disposed = true;
      ready.clear();
      cancelPending();
    },
  };
}
