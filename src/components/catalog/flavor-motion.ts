/** All timings are milliseconds, measured from a flavor selection. */
export const flavorMotion = {
  total: 960,
  background: 850,
  backgroundScale: 850,
  backgroundFromScale: 1.06,
  backgroundCrossfade: 160,
  exit: 260,
  enterDelay: 140,
  enter: 420,
  // The incoming pack moves from 140ms but stays transparent until 260ms.
  // This deliberately eliminates visible double exposure between two fronts.
  packVisibleAt: 260,
  packDistance: 24,
  packAngle: 20,
  chip: 280,
  textDelay: 120,
  textStagger: 40,
  textEnd: 400,
  textDistance: 6,
  button: 300,
  accent: 600,
  simple: 400,
  reduced: 250,
  idlePreload: 120,
  easing: {
    background: "cubic-bezier(.65,0,.35,1)",
    exit: "cubic-bezier(.4,0,1,1)",
    enter: "cubic-bezier(.2,.9,.2,1)",
    chip: "cubic-bezier(.4,0,.2,1)",
    fade: "linear",
  },
} as const;

export type FlavorPoint = { x: number; y: number };
export type FlavorChange = {
  token: number;
  fromId: string;
  toId: string;
  direction: number;
  point: FlavorPoint;
  startedAt: number;
  mode: "full" | "simple" | "reduced";
};
export const flavorDuration = (change: FlavorChange) =>
  change.mode === "full"
    ? flavorMotion.total
    : change.mode === "reduced"
      ? flavorMotion.reduced
      : flavorMotion.simple;

export function elementPoint(element: Element): FlavorPoint {
  const bounds = element.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

export function revealGeometry(
  width: number,
  height: number,
  point: FlavorPoint,
) {
  const x = Math.max(0, Math.min(width, point.x));
  const y = Math.max(0, Math.min(height, point.y));
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  return { x, y, radius: Math.ceil(radius) + 2 };
}
