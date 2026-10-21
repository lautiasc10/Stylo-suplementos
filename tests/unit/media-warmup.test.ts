import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleMediaWarmup } from "../../src/components/catalog/media-warmup";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function browser(images: { decode: () => Promise<void> }[], saveData = false) {
  vi.useFakeTimers();
  vi.stubGlobal("navigator", { connection: { saveData } });
  vi.stubGlobal("document", { hidden: false });
  const idle = vi.fn();
  const cancelIdle = vi.fn();
  vi.stubGlobal("window", {
    requestIdleCallback: idle,
    cancelIdleCallback: cancelIdle,
  });
  return {
    root: { querySelectorAll: () => images } as unknown as Element,
    idle,
    cancelIdle,
  };
}

describe("precarga secundaria de la ficha", () => {
  it("espera el producto y el fondo visibles antes de usar tiempo libre", async () => {
    let finish!: () => void;
    const decoded = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { root, idle } = browser([
      { decode: () => decoded },
      { decode: () => Promise.resolve() },
    ]);
    const warm = vi.fn();
    scheduleMediaWarmup(root, warm, 120);
    await vi.advanceTimersByTimeAsync(2000);
    expect(idle).not.toHaveBeenCalled();
    finish();
    await vi.advanceTimersByTimeAsync(120);
    expect(idle).toHaveBeenCalledOnce();
    expect(warm).not.toHaveBeenCalled();
    idle.mock.calls[0][0]();
    expect(warm).toHaveBeenCalledOnce();
  });

  it("un cambio de variante cancela el trabajo anterior incluso si decode termina después", async () => {
    let finish!: () => void;
    const decoded = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { root, idle } = browser([{ decode: () => decoded }]);
    const cancel = scheduleMediaWarmup(root, vi.fn(), 120);
    cancel();
    finish();
    await vi.advanceTimersByTimeAsync(1000);
    expect(idle).not.toHaveBeenCalled();
  });

  it("no descarga vecinos con ahorro de datos ni ejecuta el trabajo con la pestaña oculta", async () => {
    const decode = vi.fn(() => Promise.resolve());
    const { root, idle } = browser([{ decode }], true);
    scheduleMediaWarmup(root, vi.fn(), 120);
    await vi.advanceTimersByTimeAsync(1000);
    expect(decode).not.toHaveBeenCalled();
    expect(idle).not.toHaveBeenCalled();
    const warm = vi.fn();
    const view = browser([]);
    scheduleMediaWarmup(view.root, warm, 120);
    await vi.advanceTimersByTimeAsync(120);
    vi.stubGlobal("document", { hidden: true });
    view.idle.mock.calls[0][0]();
    expect(warm).not.toHaveBeenCalled();
  });
});
