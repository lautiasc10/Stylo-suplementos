"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const INTRO_URL = "/visuals/stylo-scoop-intro-v3.mp4";
const MAX_BYTES = 3_500_000;

/** Fully buffered, native playback. Its final moving frames crossfade into
 * the lion; never freeze the last frame and move it with CSS afterward. */
export function HeroAtmosphere({
  containerRef,
  onSettled,
  onComplete,
  onRevealLion,
  onBrand,
  onUnavailable,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onSettled: () => void;
  onComplete: () => void;
  onRevealLion: () => void;
  onBrand: () => void;
  onUnavailable: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const completeExit = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<
    "loading" | "playing" | "leaving" | "done"
  >("loading");
  const completed = phase === "done";

  useEffect(() => {
    if (completed) return;
    const container = containerRef.current;
    const element = videoRef.current;
    if (!container || !element) return;
    const video: HTMLVideoElement = element;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (
      connection?.saveData ||
      ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "")
    ) {
      setPhase("done");
      onSettled();
      onUnavailable();
      return;
    }

    const request = new AbortController();
    let disposed = false;
    let finished = false;
    let scheduled = false;
    let playing = false;
    let fading = false;
    let settled = false;
    let lionRevealed = false;
    let brandRevealed = false;
    let videoFrame: number | null = null;
    let blobUrl: string | null = null;
    let deadline: number | undefined;
    let presentation: number | undefined;

    function release() {
      request.abort();
      window.clearTimeout(deadline);
      window.clearTimeout(presentation);
      if (videoFrame !== null) video.cancelVideoFrameCallback(videoFrame);
      videoFrame = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
    }

    function finish() {
      if (finished || disposed) return;
      finished = true;
      release();
      settle();
      onComplete();
      setPhase("done");
    }

    function skip() {
      if (finished || disposed) return;
      finish();
      onUnavailable();
    }

    function leave() {
      if (fading || finished || disposed) return;
      fading = true;
      setPhase("leaving");
      settle();
    }

    function revealLion() {
      if (lionRevealed || finished || disposed) return;
      lionRevealed = true;
      onRevealLion();
    }

    function handleEnded() {
      leave();
      revealLion();
      finish();
    }

    completeExit.current = finish;

    function settle() {
      if (settled || disposed) return;
      settled = true;
      onSettled();
    }

    async function load() {
      if (disposed || finished || document.hidden) return skip();
      // Buffer the entrance first; its decoder is released before the
      // interactive lion starts. The matching poster carries the crossfade.
      deadline = window.setTimeout(skip, 4000);
      try {
        const response = await fetch(INTRO_URL, {
          signal: request.signal,
          priority: "auto",
        });
        const size = Number(response.headers.get("content-length"));
        if (!response.ok || size > MAX_BYTES) return skip();
        const blob = await response.blob();
        if (disposed || finished) return;
        if (blob.size > MAX_BYTES || !blob.size) return skip();
        window.clearTimeout(deadline);
        blobUrl = URL.createObjectURL(blob);
        video.preload = "auto";
        video.src = blobUrl;
        video.load();
        deadline = window.setTimeout(skip, 2000);
      } catch {
        skip();
      }
    }

    function schedule() {
      if (scheduled || finished || disposed) return;
      scheduled = true;
      void load();
    }

    function handleCanPlay() {
      void video.play().catch(skip);
    }

    function handlePlaying() {
      if (playing || finished || disposed) return;
      playing = true;
      window.clearTimeout(deadline);
      setPhase("playing");
      handleTime();
      if (typeof video.requestVideoFrameCallback === "function")
        videoFrame = video.requestVideoFrameCallback(handleVideoFrame);
      // A stalled video must never keep the storefront waiting indefinitely.
      presentation = window.setTimeout(skip, 6500);
    }

    function handleTime() {
      if (finished || !playing || !Number.isFinite(video.duration)) return;
      if (!brandRevealed && video.currentTime >= video.duration * 0.1) {
        brandRevealed = true;
        onBrand();
      }
      if (video.currentTime >= video.duration - 1.5) settle();
      if (video.currentTime >= video.duration - 1.15) revealLion();
      if (video.currentTime >= video.duration - 0.75) leave();
    }

    function handleVideoFrame() {
      videoFrame = null;
      if (disposed || finished) return;
      handleTime();
      if (!disposed && !finished)
        videoFrame = video.requestVideoFrameCallback(handleVideoFrame);
    }

    function handleVisibility() {
      if (document.hidden) skip();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.35) schedule();
        else skip();
      },
      { threshold: [0, 0.35] },
    );

    video.addEventListener("canplay", handleCanPlay, { once: true });
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("timeupdate", handleTime);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", skip);
    document.addEventListener("visibilitychange", handleVisibility);
    observer.observe(container);
    return () => {
      disposed = true;
      completeExit.current = () => {};
      observer.disconnect();
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("timeupdate", handleTime);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", skip);
      document.removeEventListener("visibilitychange", handleVisibility);
      release();
    };
  }, [
    containerRef,
    completed,
    onSettled,
    onComplete,
    onRevealLion,
    onBrand,
    onUnavailable,
  ]);

  if (phase === "done") return null;
  return (
    <div
      className="hero-atmosphere"
      data-phase={phase}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && phase === "leaving")
          completeExit.current();
      }}
    >
      <video ref={videoRef} muted playsInline preload="none" tabIndex={-1} />
    </div>
  );
}
