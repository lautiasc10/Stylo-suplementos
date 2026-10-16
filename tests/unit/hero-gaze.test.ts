import { describe, expect, it } from "vitest";
import {
  advanceGaze,
  gazeFrameTime,
  gazeTime,
} from "@/components/storefront/hero-gaze";

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
  it("entrega el control a un cursor distante sin saltarse de golpe el giro", () => {
    let position = 0.849;
    let velocity = 0;
    const target = 3.2;
    for (let frame = 0; frame < 180; frame++) {
      const next = advanceGaze(position, velocity, target, 1000 / 60);
      expect(next.position).toBeGreaterThanOrEqual(position);
      expect(next.position - position).toBeLessThanOrEqual(2.4 / 60 + 1e-10);
      expect(next.position).toBeLessThanOrEqual(target);
      position = next.position;
      velocity = next.velocity;
    }
    expect(position).toBeCloseTo(target, 5);
  });
  it("cambiar de dirección o volver de una pestaña oculta conserva una velocidad acotada", () => {
    let state = { position: 2, velocity: 2.4 };
    for (let frame = 0; frame < 180; frame++) {
      const next = advanceGaze(
        state.position,
        state.velocity,
        0.7,
        frame === 0 ? 5000 : 1000 / 60,
      );
      expect(Math.abs(next.position - state.position)).toBeLessThanOrEqual(
        frame === 0 ? 0.12 + 1e-10 : 2.4 / 60 + 1e-10,
      );
      expect(Math.abs(next.velocity)).toBeLessThanOrEqual(2.4);
      state = next;
    }
    expect(state.position).toBeCloseTo(0.7, 5);
  });
});
