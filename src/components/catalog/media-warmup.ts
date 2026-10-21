/** Background work must not compete with the currently visible product/scene.
 * Explicit pointer/focus intent bypasses this scheduler in the gallery. */
export function scheduleMediaWarmup(
  root: Element,
  warm: () => void,
  delay: number,
) {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle: number | undefined;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  const images = [
    ...root.querySelectorAll<HTMLImageElement>(
      "img.product-frame-current, .flavor-hero-background[data-current] .flavor-scene-piece img",
    ),
  ];
  const run = () => {
    if (!cancelled && !document.hidden) warm();
  };
  if (
    !connection?.saveData &&
    !["slow-2g", "2g"].includes(connection?.effectiveType ?? "")
  ) {
    void Promise.allSettled(
      images.map((image) =>
        image.complete && image.naturalWidth
          ? Promise.resolve()
          : image.decode(),
      ),
    ).then(() => {
      if (cancelled) return;
      timer = setTimeout(() => {
        if ("requestIdleCallback" in window)
          idle = window.requestIdleCallback(run, { timeout: 1000 });
        else run();
      }, delay);
    });
  }
  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
  };
}
