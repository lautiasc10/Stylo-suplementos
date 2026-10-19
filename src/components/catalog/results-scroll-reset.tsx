"use client";

import { useLayoutEffect, useRef } from "react";

/** Reset after the new results commit, rather than scrolling stale results
 * while the request is still pending. Does not affect product variant URLs. */
export function ResultsScrollReset({ queryKey }: { queryKey: string }) {
  const previous = useRef(queryKey);
  useLayoutEffect(() => {
    if (previous.current === queryKey) return;
    previous.current = queryKey;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [queryKey]);
  return null;
}
