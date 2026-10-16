"use client";

import { useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribe(update: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
}
const snapshot = () => window.matchMedia(QUERY).matches;
const serverSnapshot = () => null;

// Motion 14's hook captures the mount preference. Subscribe as well so an
// accessibility setting changed with the page open takes effect immediately.
export function useMotionPreference() {
  const initial = useReducedMotion();
  const live = useSyncExternalStore<boolean | null>(
    subscribe,
    snapshot,
    serverSnapshot,
  );
  return live ?? initial;
}
