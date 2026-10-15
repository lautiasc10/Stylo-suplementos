// Intermediate frames are baked into the local clip, never computed on hover.
export const HERO_VIDEO_FPS = 96;
const SOURCE_VIDEO_FPS = 24;
const ORIGIN = 0.7;
const CENTER_WIDTH = 0.1;

function hermite(
  t: number,
  start: number,
  end: number,
  startSlope: number,
  endSlope: number,
  width: number,
) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * start +
    (t3 - 2 * t2 + t) * startSlope * width +
    (-2 * t3 + 3 * t2) * end +
    (t3 - t2) * endSlope * width
  );
}

/** Continuous position and velocity through the frontal pose; side poses stay unchanged. */
export function gazeTime(progress: number, duration: number) {
  const x = Math.max(0, Math.min(1, progress));
  const first = duration * 0.15;
  const last = duration - first;
  const center =
    Math.floor((duration / 2) * SOURCE_VIDEO_FPS) / SOURCE_VIDEO_FPS;
  const leftSlope = (center - last) / ORIGIN;
  const rightSlope = (first - center) / (1 - ORIGIN);
  const centerSlope = (leftSlope + rightSlope) / 2;
  if (x < ORIGIN - CENTER_WIDTH) return last + leftSlope * x;
  if (x > ORIGIN + CENTER_WIDTH) return center + rightSlope * (x - ORIGIN);
  if (x <= ORIGIN) {
    const start = center - leftSlope * CENTER_WIDTH;
    return hermite(
      (x - ORIGIN + CENTER_WIDTH) / CENTER_WIDTH,
      start,
      center,
      leftSlope,
      centerSlope,
      CENTER_WIDTH,
    );
  }
  return hermite(
    (x - ORIGIN) / CENTER_WIDTH,
    center,
    center + rightSlope * CENTER_WIDTH,
    centerSlope,
    rightSlope,
    CENTER_WIDTH,
  );
}

/** Seek inside a source frame, avoiding ambiguous timestamps on GOP boundaries. */
export function gazeFrameTime(time: number) {
  return (Math.round(time * HERO_VIDEO_FPS) + 0.5) / HERO_VIDEO_FPS;
}
