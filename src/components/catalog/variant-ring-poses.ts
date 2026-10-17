export type RingSize = "compact" | "full";
/** Signed shortest circular offset. Only offsets -1/0/+1 are visible. */
export function ringSlot(index: number, active: number, count: number): number {
  if (index === active) return 0;
  if (count === 2) return 1;
  const clockwise = (index - active + count) % count;
  return clockwise <= count / 2 ? clockwise : clockwise - count;
}
export function ringDirection(
  from: number,
  to: number,
  count: number,
  tie = 1,
) {
  const forward = (to - from + count) % count;
  return forward === count / 2 ? tie : forward <= count / 2 ? 1 : -1;
}
export function ringPose(slot: number, _size: RingSize) {
  if (!slot)
    return {
      transform: "translate3d(0%, 0, 0px) rotateY(0deg) scale(1)",
      opacity: 1,
    };
  const distance = Math.abs(slot);
  const x = Math.sign(slot) * Math.min(distance, 2) * 60;
  // 60% offset, .55 scale and a fixed base keep overlap below 15% even for wide packs.
  const z = -Math.min(1, distance) * 80;
  const scale = 1 - 0.45 * Math.min(1, distance);
  return {
    transform: `translate3d(${x}%, 0, ${z}px) rotateY(${-Math.sign(slot) * 10}deg) scale(${scale})`,
    opacity: distance <= 1 ? 1 - distance * 0.7 : 0,
  };
}
