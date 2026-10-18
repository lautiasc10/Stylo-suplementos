"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useMotionPreference } from "@/components/ui/use-motion-preference";
import {
  flavorDuration,
  flavorMotion,
  type FlavorChange,
  type FlavorPoint,
} from "./flavor-motion";

const simpleKey = "stylo.flavor-motion.simple.v1";
let sessionSimple = false;

export function useFlavorChoreography(
  root: RefObject<HTMLDivElement | null>,
  activeId: string,
  select: (id: string) => void,
) {
  const [change, setChange] = useState<FlavorChange | null>(null);
  const [running, setRunning] = useState(false);
  const current = useRef(activeId);
  current.current = activeId;
  const sequence = useRef(0);
  const reduced = useMotionPreference();

  const request = useCallback(
    (id: string, direction: number, clientPoint: FlavorPoint) => {
      if (id === current.current) return;
      const bounds = root.current?.getBoundingClientRect();
      let simple = sessionSimple;
      try {
        simple ||= sessionStorage.getItem(simpleKey) === "1";
      } catch {
        /* Storage may be disabled; the in-memory session flag remains available. */
      }
      const fromId = current.current;
      current.current = id;
      // Selection is synchronous with the gesture, independent of all media.
      select(id);
      setChange({
        token: ++sequence.current,
        fromId,
        toId: id,
        direction: direction || 1,
        point: {
          x: clientPoint.x - (bounds?.left ?? 0),
          y: clientPoint.y - (bounds?.top ?? 0),
        },
        startedAt: performance.now(),
        mode: reduced !== false ? "reduced" : simple ? "simple" : "full",
      });
      setRunning(true);
    },
    [root, reduced, select],
  );

  useEffect(() => {
    if (reduced && change && change.mode !== "reduced")
      setChange({ ...change, mode: "reduced", startedAt: performance.now() });
  }, [reduced, change]);

  useEffect(() => {
    if (!change) return;
    let frame = 0;
    let previous = performance.now();
    const gaps: number[] = [];
    const sample = (now: number) => {
      gaps.push(now - previous);
      previous = now;
      if (
        gaps.filter((gap) => gap > flavorMotion.slowFrame).length >=
        flavorMotion.slowFrameLimit
      ) {
        sessionSimple = true;
        try {
          sessionStorage.setItem(simpleKey, "1");
        } catch {
          /* No persistent storage is required for the animation. */
        }
      }
      if (document.hidden || now - change.startedAt >= flavorDuration(change)) {
        setRunning(false);
        const detail = {
          token: change.token,
          mode: change.mode,
          duration: now - change.startedAt,
          frames: gaps.length,
          framesOver20: gaps.filter((gap) => gap > 20).length,
          framesOver32: gaps.filter((gap) => gap > 32).length,
          maxFrame: Math.max(...gaps),
          simplifiedNext: sessionSimple,
        };
        performance.measure("stylo:flavor-transition", {
          start: change.startedAt,
          end: now,
          detail,
        });
        return;
      }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, [change]);

  return { change, running, request };
}
