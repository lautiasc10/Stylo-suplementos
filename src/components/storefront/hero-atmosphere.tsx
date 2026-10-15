"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const INTRO_URL = "/visuals/stylo-scoop-intro-v1.mp4";
const MAX_BYTES = 3_500_000;

/** A finite decorative entrance, loaded after the interactive lion is ready. */
export function HeroAtmosphere({
  containerRef,
  onSettled,
  onComplete,
  onRevealLion,
  onUnavailable,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onSettled: () => void;
  onComplete: () => void;
  onRevealLion: () => void;
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
      ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "") ||
      !CSS.supports("mix-blend-mode", "screen") ||
      !CSS.supports("mask-image", "linear-gradient(black, transparent)")
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
    let videoFrame: number | null = null;
    let blobUrl: string | null = null;
    let idle: number | null = null;
    let delay: number | undefined;
    let deadline: number | undefined;
    let presentation: number | undefined;

    function release() {
      request.abort();
      if (idle !== null) window.cancelIdleCallback(idle);
      window.clearTimeout(delay);
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
      // Keep the last decoded frame until the lateral exit completes. Removing
      // the video at `ended` would cut the scoop off before it leaves the screen.
      leave();
      revealLion();
    }

    completeExit.current = finish;

    function settle() {
      if (settled || disposed) return;
      settled = true;
      onSettled();
    }

    async function load() {
      if (disposed || finished || document.hidden) return skip();
      // Buffer this small, finite clip completely before playback to avoid a
      // frozen background on slower transfers. The lion never waits for it.
      deadline = window.setTimeout(skip, 4000);
      try {
        const response = await fetch(INTRO_URL, {
          signal: request.signal,
          priority: "low",
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
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(
          () => {
            void load();
          },
          { timeout: 800 },
        );
      } else {
        delay = window.setTimeout(() => {
          void load();
        }, 350);
      }
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
      presentation = window.setTimeout(skip, 5800);
    }

    function handleTime() {
      if (finished || !playing || !Number.isFinite(video.duration)) return;
      // Establish the floating dust while the filmed powder is still visible,
      // so its disappearance never leaves a dark gap between the two layers.
      if (video.currentTime >= video.duration - 1.6) settle();
      if (video.currentTime >= video.duration - 1.3) leave();
      if (video.currentTime >= video.duration - 1.1) revealLion();
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
