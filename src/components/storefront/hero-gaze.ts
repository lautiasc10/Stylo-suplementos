// Intermediate frames are baked into the local clip, never computed on hover.
export const HERO_VIDEO_FPS = 96;
export const HERO_GAZE_MAX_SPEED = 2.8;
const SOURCE_VIDEO_FPS = 24;
const ORIGIN = 0.5;
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

/** Damped tracking with a bounded source-time velocity. A new pointer target
 * must not skip half the clip when the entrance hands control to the mouse. */
export function advanceGaze(
  position: number,
  velocity: number,
  target: number,
  elapsedMs: number,
) {
  const dt = Math.max(0, Math.min(elapsedMs, 50)) / 1000;
  if (!dt) return { position, velocity };
  const omega = 14;
  const maxSpeed = HERO_GAZE_MAX_SPEED;
  const change = position - target;
  const decay = Math.exp(-omega * dt);
  const impulse = (velocity + omega * change) * dt;
  const desired = target + (change + impulse) * decay;
  const proposedStep = Math.max(
    -maxSpeed * dt,
    Math.min(maxSpeed * dt, desired - position),
  );
  // A fast cursor reversal must never make the face travel away from its new
  // target for a frame before following it.
  const step = proposedStep * (target - position) < 0 ? 0 : proposedStep;
  if (!step && target !== position) return { position, velocity: 0 };
  const next = position + step;
  if ((target - position) * (target - next) <= 0)
    return { position: target, velocity: 0 };
  return {
    position: next,
    velocity: Math.max(
      -maxSpeed,
      Math.min(maxSpeed, (velocity - omega * impulse) * decay),
    ),
  };
}
