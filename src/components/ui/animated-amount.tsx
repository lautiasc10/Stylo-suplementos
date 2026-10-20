"use client";

import { animate } from "framer-motion";
import { useLayoutEffect, useRef } from "react";
import { formatPrice } from "@/modules/catalog/model";
import { useMotionPreference } from "./use-motion-preference";

/** The real amount updates immediately for assistive technology and copying.
 * Only an aria-hidden visual counter changes per frame; React never rerenders
 * the product page or promotion grid during the count. */
export function AnimatedAmount({
  value,
  resetKey,
}: {
  value: number;
  resetKey?: string;
}) {
  const visual = useRef<HTMLSpanElement>(null);
  const current = useRef(value);
  const previousKey = useRef(resetKey);
  const reduced = useMotionPreference();
  const formatted = formatPrice(value, 0);

  useLayoutEffect(() => {
    const node = visual.current;
    if (!node) return;
    const reset = previousKey.current !== resetKey;
    previousKey.current = resetKey;
    const write = (amount: number) => {
      current.current = amount;
      node.dataset.value = formatPrice(Math.round(amount), 0);
    };
    if (reset || reduced || document.hidden || current.current === value) {
      write(value);
      return;
    }
    write(current.current);
    const animation = animate(current.current, value, {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: write,
      onComplete: () => write(value),
    });
    const finish = () => {
      if (!document.hidden) return;
      animation.stop();
      write(value);
    };
    document.addEventListener("visibilitychange", finish);
    return () => {
      animation.stop();
      document.removeEventListener("visibilitychange", finish);
    };
  }, [value, resetKey, reduced]);

  return (
    <span className="animated-amount">
      <span className="animated-amount-target">{formatted}</span>
      <span
        className="animated-amount-visual"
        ref={visual}
        aria-hidden="true"
        data-value={formatted}
      />
    </span>
  );
}
