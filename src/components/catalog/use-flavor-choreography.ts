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
  type FlavorChange,
  type FlavorPoint,
} from "./flavor-motion";

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
        mode: reduced !== false ? "reduced" : "full",
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
          simplifiedNext: false,
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
