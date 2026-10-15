"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const INTRO_URL = "/visuals/stylo-scoop-layers-v2.mp4";
const MAX_BYTES = 2_100_000;
const LAYER_WIDTH = 1280;
const LAYER_HEIGHT = 720;

/** A finite decorative entrance, loaded after the interactive lion is ready. */
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
  const scoopRef = useRef<HTMLCanvasElement>(null);
  const powderRef = useRef<HTMLCanvasElement>(null);
  const completeExit = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<
    "loading" | "playing" | "leaving" | "dispersing" | "done"
  >("loading");
  const completed = phase === "done";

  useEffect(() => {
    if (completed) return;
    const container = containerRef.current;
    const element = videoRef.current;
    if (!container || !element) return;
    const video: HTMLVideoElement = element;
    const scoop = scoopRef.current?.getContext("2d", { alpha: false });
    const powder = powderRef.current?.getContext("2d", { alpha: false });
    if (!scoop || !powder) {
      onUnavailable();
      return;
    }
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (
      connection?.saveData ||
      ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "") ||
      !CSS.supports("mix-blend-mode", "screen") ||
      !CSS.supports("mix-blend-mode", "plus-lighter")
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
    let fallbackFrame: number | null = null;
    let drawnTime = -1;
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
      if (fallbackFrame !== null) window.cancelAnimationFrame(fallbackFrame);
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
      // Only now does the stationary powder disperse. The scoop has already
      // left independently; the last powder frame blends with ambient motes.
      setPhase("dispersing");
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
      else fallbackFrame = window.requestAnimationFrame(handleFallbackFrame);
      // A stalled video must never keep the storefront waiting indefinitely.
      presentation = window.setTimeout(skip, 4200);
    }

    function handleTime() {
      if (finished || !playing || !Number.isFinite(video.duration)) return;
      if (drawnTime !== video.currentTime && video.readyState >= 2) {
        // Two tiles, one decoder. Each canvas has a stable 1280 x 720 surface;
        // CSS moves only the scoop without moving or resampling the powder.
        scoop!.drawImage(
          video,
          0,
          0,
          LAYER_WIDTH,
          LAYER_HEIGHT,
          0,
          0,
          LAYER_WIDTH,
          LAYER_HEIGHT,
        );
        powder!.drawImage(
          video,
          LAYER_WIDTH,
          0,
          LAYER_WIDTH,
          LAYER_HEIGHT,
          0,
          0,
          LAYER_WIDTH,
          LAYER_HEIGHT,
        );
        drawnTime = video.currentTime;
      }
      if (!brandRevealed && video.currentTime >= video.duration * 0.36) {
        brandRevealed = true;
        onBrand();
      }
      if (video.currentTime >= video.duration * 0.5) settle();
      if (video.currentTime >= video.duration - 1.1) leave();
      if (video.currentTime >= video.duration - 0.6) revealLion();
    }

    function handleVideoFrame() {
      videoFrame = null;
      if (disposed || finished) return;
      handleTime();
      if (!disposed && !finished)
        videoFrame = video.requestVideoFrameCallback(handleVideoFrame);
    }

    function handleFallbackFrame() {
      fallbackFrame = null;
      if (disposed || finished || video.ended) return;
      handleTime();
      fallbackFrame = window.requestAnimationFrame(handleFallbackFrame);
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
        if (event.target === event.currentTarget && phase === "dispersing")
          completeExit.current();
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        preload="none"
        tabIndex={-1}
        hidden
      />
      <canvas
        className="hero-powder-layer"
        ref={powderRef}
        width={LAYER_WIDTH}
        height={LAYER_HEIGHT}
      />
      <canvas
        className="hero-scoop-layer"
        ref={scoopRef}
        width={LAYER_WIDTH}
        height={LAYER_HEIGHT}
      />
    </div>
  );
}
