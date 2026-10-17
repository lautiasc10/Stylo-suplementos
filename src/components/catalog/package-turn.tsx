"use client";

import { useLayoutEffect, useRef } from "react";
import type { GalleryImage } from "./product-gallery";
import { positionProductPhoto } from "./product-photo-position";

export type PackageTurnState = {
  from: GalleryImage;
  to: GalleryImage;
  sequence: number;
};
export const PACKAGE_TURN_DURATION = 1100;

/** Photographed poses, never mirrored labels or a nutrition sheet as a back face.
 * Only compositor transforms/opacity animate; the decoded target is committed
 * after it reaches its final, fully opaque front pose. */
export function PackageTurn({
  turn,
  onFinish,
}: {
  turn: PackageTurnState;
  onFinish: () => void;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const complete = useRef(onFinish);
  complete.current = onFinish;
  const poses = [turn.from, ...(turn.from.turnImages ?? []), turn.to];
  useLayoutEffect(() => {
    const nodes = [
      ...(root.current?.querySelectorAll<HTMLImageElement>("img") ?? []),
    ];
    const count = nodes.length;
    const animations = nodes.map((node, i) => {
      node.dataset.portrait = String(
        node.naturalHeight / node.naturalWidth > 1.3,
      );
      positionProductPhoto(node);
      const start = i === 0 ? 0 : (i - 0.4) / (count - 1);
      const end = i === count - 1 ? 1 : (i + 0.4) / (count - 1);
      const center = i / (count - 1);
      const frames: Keyframe[] =
        i === 0
          ? [
              { opacity: 1, transform: "rotateY(0deg)", offset: 0 },
              { opacity: 0, transform: "rotateY(-78deg)", offset: end },
              { opacity: 0, offset: 1 },
            ]
          : i === count - 1
            ? [
                { opacity: 0, offset: 0 },
                { opacity: 0, transform: "rotateY(78deg)", offset: start },
                { opacity: 1, transform: "rotateY(0deg)", offset: 1 },
              ]
            : [
                { opacity: 0, offset: 0 },
                { opacity: 0, transform: "rotateY(68deg)", offset: start },
                { opacity: 1, transform: "rotateY(0deg)", offset: center },
                { opacity: 0, transform: "rotateY(-68deg)", offset: end },
                { opacity: 0, offset: 1 },
              ];
      return node.animate(frames, {
        duration: PACKAGE_TURN_DURATION,
        easing: "cubic-bezier(.25,.1,.25,1)",
        fill: "both",
      });
    });
    let cancelled = false;
    void Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (!cancelled) complete.current();
      })
      .catch(() => {});
    // A timer also settles a browser that cancels an offscreen animation.
    const timer = window.setTimeout(() => {
      if (!cancelled) complete.current();
    }, PACKAGE_TURN_DURATION + 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
    };
  }, [turn]);
  return (
    <span ref={root} className="package-turn" aria-hidden="true">
      {poses.map((pose, i) => (
        <img
          key={`${pose.id}:${i}`}
          className="product-frame"
          src={pose.src}
          crossOrigin="anonymous"
          alt=""
          width={720}
          height={720}
          decoding="async"
        />
      ))}
    </span>
  );
}
