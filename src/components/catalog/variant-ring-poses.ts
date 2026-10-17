export type RingSize = "compact" | "full";
/** Windowed ring: at rest there are at most two neighbors, even with 100 SKUs. */
export function ringSlot(index: number, active: number, count: number): number {
  if (index === active) return 0;
  if (count === 2) return 1;
  if (index === (active + 1) % count) return 1;
  if (index === (active - 1 + count) % count) return -1;
  return 2;
}
export function ringPose(slot: number, size: RingSize) {
  if (!slot)
    return {
      transform: "translate3d(0%, 0, 0px) rotateY(0deg) scale(1)",
      opacity: 1,
    };
  const distance = Math.abs(slot),
    angle = (slot * 50 * Math.PI) / 180;
  const x =
    ((size === "compact" ? 34 : 40) * Math.sin(angle)) /
    Math.sin((50 * Math.PI) / 180);
  const z =
    (-(size === "compact" ? 110 : 140) * (1 - Math.cos(angle))) /
    (1 - Math.cos((50 * Math.PI) / 180));
  const scale =
    1 + ((size === "compact" ? 0.55 : 0.7) - 1) * Math.min(1, distance);
  return {
    transform: `translate3d(${x}%, 0, ${z}px) rotateY(${-slot * 14}deg) scale(${scale})`,
    opacity:
      distance <= 1 ? 1 - distance * 0.6 : Math.max(0, 0.4 * (2 - distance)),
  };
}
