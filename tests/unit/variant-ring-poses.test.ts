import { describe, expect, it } from "vitest";
import {
  ringPose,
  ringSlot,
  ringDirection,
} from "../../src/components/catalog/variant-ring-poses";

describe("anillo de variantes", () => {
  it("mantiene solo activa y vecinas, incluso con ocho o cien variantes", () => {
    for (const count of [1, 2, 3, 6, 8, 100]) {
      for (let active = 0; active < count; active++) {
        const visible = Array.from({ length: count }, (_, i) =>
          ringSlot(i, active, count),
        ).filter((slot) => Math.abs(slot) <= 1);
        expect(visible).toHaveLength(Math.min(3, count));
        expect(visible.filter((slot) => slot === 0)).toHaveLength(1);
        if (count === 2)
          expect(visible).toEqual(expect.arrayContaining([0, 1]));
      }
    }
  });
  it("usa dos tamaños sin invertir el envase, con profundidad y curvas continuas", () => {
    expect(ringPose(0, "compact")).toEqual(ringPose(0, "full"));
    expect(ringPose(0, "full").opacity).toBe(1);
    expect(ringPose(1, "compact").transform).toContain("scale(0.55)");
    expect(ringPose(-1, "full").transform).toContain("scale(0.55)");
    for (const slot of [-2, -1, -0.5, 0, 0.5, 1, 2]) {
      const pose = ringPose(slot, "full");
      expect(pose.opacity).toBeGreaterThanOrEqual(0);
      expect(pose.opacity).toBeLessThanOrEqual(1);
      expect(pose.transform).not.toMatch(/rotateY\(-?(90|180)deg\)/);
    }
    expect(ringPose(2, "compact").opacity).toBe(0);
    expect(ringPose(-2, "full").opacity).toBe(0);
  });
  it("elige el camino circular más corto para chips y mantiene los empates direccionales", () => {
    expect(ringDirection(7, 0, 8)).toBe(1);
    expect(ringDirection(0, 7, 8)).toBe(-1);
    expect(ringDirection(0, 6, 8)).toBe(-1);
    expect(ringDirection(4, 0, 8, -1)).toBe(-1);
    expect(ringDirection(0, 1, 2, -1)).toBe(-1);
    expect(ringSlot(0, 7, 8)).toBe(1);
    expect(ringSlot(7, 0, 8)).toBe(-1);
  });
});
