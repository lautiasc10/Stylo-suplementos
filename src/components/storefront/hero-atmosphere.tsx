"use client";

import { useEffect, useRef, useState } from "react";

const INTRO_URL = "/visuals/stylo-scoop-intro-v3.mp4";
const MAX_BYTES = 3_500_000;
const PREPARATION_BUDGET = 300;

/** An optional excerpt of the existing clip. Slow media is omitted, never
 * allowed to lengthen or restart the shared 1.8 second entrance. */
export function HeroAtmosphere({
  startedAt,
  leaving,
}: {
  startedAt: number;
  leaving: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    const video: HTMLVideoElement = element;
    const request = new AbortController();
    let disposed = false;
    let source: string | null = null;
    let sought = false;
    let started = false;
    const elapsed = () => performance.now() - startedAt;
    function release() {
      request.abort();
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (source) URL.revokeObjectURL(source);
      source = null;
    }
    function omit() {
      if (disposed) return;
      disposed = true;
      setReady(false);
      release();
    }
    const deadline = window.setTimeout(
      omit,
      Math.max(0, PREPARATION_BUDGET - elapsed()),
    );
    function metadata() {
      if (disposed || elapsed() >= PREPARATION_BUDGET) return omit();
      // The source's opening hold is unnecessary in the short entrance.
      // Reuse its real pour, without manufacturing frames or another asset.
      video.playbackRate = 1;
      video.currentTime = Math.min(
        video.duration - 0.05,
        2.2 + elapsed() * 0.001,
      );
      sought = true;
    }
    function seeked() {
      if (!disposed && sought && !started) {
        started = true;
        void video.play().catch(omit);
      }
    }
    function playing() {
      if (disposed || elapsed() >= PREPARATION_BUDGET) return omit();
      window.clearTimeout(deadline);
      setOffset(elapsed());
      setReady(true);
    }
    video.addEventListener("loadedmetadata", metadata);
    video.addEventListener("seeked", seeked);
    video.addEventListener("playing", playing, { once: true });
    video.addEventListener("error", omit);
    void (async () => {
      try {
        const response = await fetch(INTRO_URL, {
          signal: request.signal,
          priority: "high",
        });
        if (
          !response.ok ||
          Number(response.headers.get("content-length")) > MAX_BYTES
        )
          return omit();
        const blob = await response.blob();
        if (disposed) return;
        if (
          !blob.size ||
          blob.size > MAX_BYTES ||
          elapsed() >= PREPARATION_BUDGET
        )
          return omit();
        source = URL.createObjectURL(blob);
        video.src = source;
        video.load();
      } catch {
        omit();
      }
    })();
    return () => {
      disposed = true;
      window.clearTimeout(deadline);
      video.removeEventListener("loadedmetadata", metadata);
      video.removeEventListener("seeked", seeked);
      video.removeEventListener("playing", playing);
      video.removeEventListener("error", omit);
      release();
    };
  }, [startedAt]);
  return (
    <div
      className="hero-atmosphere"
      data-phase={ready ? (leaving ? "leaving" : "playing") : "loading"}
      style={{ animationDelay: `-${offset}ms` }}
      aria-hidden="true"
    >
      <video ref={videoRef} muted playsInline preload="none" tabIndex={-1} />
    </div>
  );
}
