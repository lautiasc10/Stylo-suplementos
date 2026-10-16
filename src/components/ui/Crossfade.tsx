"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMotionPreference } from "./use-motion-preference";

/** At most two visual layers, with bounded cleanup even when animation frames
 * are suspended. The server and first client render are fully visible. */
export function Crossfade({
  valueKey,
  children,
  className = "",
}: {
  valueKey: string;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useMotionPreference();
  const [visual, setVisual] = useState<{
    key: string;
    node: ReactNode;
    previous: { key: string; node: ReactNode } | null;
  }>({ key: valueKey, node: children, previous: null });
  if (visual.key !== valueKey) {
    setVisual({
      key: valueKey,
      node: children,
      previous: { key: visual.key, node: visual.node },
    });
  }
  useEffect(() => {
    if (!visual.previous) return;
    const key = visual.key;
    const timer = window.setTimeout(
      () =>
        setVisual((value) =>
          value.key === key ? { ...value, previous: null } : value,
        ),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [visual.key, visual.previous]);
  return (
    <div className={`crossfade ${className}`}>
      {visual.previous && !reduced && (
        <div
          key={visual.previous.key}
          className="crossfade-layer crossfade-outgoing"
          aria-hidden="true"
          inert
        >
          {visual.previous.node}
        </div>
      )}
      <div
        key={valueKey}
        className="crossfade-layer"
        data-enter={visual.previous && !reduced ? "true" : undefined}
      >
        {children}
      </div>
    </div>
  );
}
