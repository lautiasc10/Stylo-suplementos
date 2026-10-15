import { describe, expect, it } from "vitest";
import { gazeFrameTime, gazeTime } from "@/components/storefront/hero-gaze";

describe("seguimiento del león", () => {
  const duration = 97 / 24;
  it("mantiene la dirección y las poses laterales", () => {
    const center = 2;
    for (const x of [0, 0.1, 0.4, 0.58]) {
      expect(gazeTime(x, duration)).toBeCloseTo(
        duration * 0.85 + ((center - duration * 0.85) * x) / 0.7,
        8,
      );
    }
    for (let i = 1; i <= 1000; i++) {
      expect(gazeTime(i / 1000, duration)).toBeLessThan(
        gazeTime((i - 1) / 1000, duration),
      );
    }
    expect(gazeTime(0.7, duration)).toBe(2);
    expect(gazeTime(0.7, 4.041667)).toBe(2);
  });
  it("cruza la pose frontal sin saltos de velocidad", () => {
    const h = 0.00001;
    for (const x of [0.6, 0.7, 0.8]) {
      const left = (gazeTime(x, duration) - gazeTime(x - h, duration)) / h;
      const right = (gazeTime(x + h, duration) - gazeTime(x, duration)) / h;
      expect(Math.abs(left - right)).toBeLessThan(0.002);
    }
  });
  it("busca dentro de los fotogramas y evita sus límites exactos", () => {
    expect(gazeFrameTime(2)).toBeCloseTo(2 + 1 / 192, 8);
    expect(gazeFrameTime(2.001)).toBe(gazeFrameTime(2));
    // Slow pointer input must expose intermediate poses, not hold the same
    // original 24 fps frame until the cursor crosses its next threshold.
    expect(gazeFrameTime(2.015)).toBeGreaterThan(gazeFrameTime(2));
  });
});
