"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const INTRO_URL = "/visuals/stylo-scoop-intro-v1.mp4";
const MAX_BYTES = 3_500_000;
const CONTENT_CUES = [0, 0.2, 0.5, 0.7, 0.8, 0.9];

/** A finite decorative entrance, loaded after the interactive lion is ready. */
export function HeroAtmosphere({
  containerRef,
  onSettled,
  onComplete,
  onCue,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onSettled: () => void;
  onComplete: () => void;
  onCue: (stage: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
      onComplete();
      return;
    }

    const request = new AbortController();
    let disposed = false;
    let finished = false;
    let scheduled = false;
    let playing = false;
    let fading = false;
    let settled = false;
    let contentCue = 0;
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

    function settle() {
      if (settled || disposed) return;
      settled = true;
      onSettled();
    }

    async function load() {
      if (disposed || finished || document.hidden) return finish();
      // Buffer this small, finite clip completely before playback to avoid a
      // frozen background on slower transfers. The lion never waits for it.
      deadline = window.setTimeout(finish, 4000);
      try {
        const response = await fetch(INTRO_URL, {
          signal: request.signal,
          priority: "low",
        });
        const size = Number(response.headers.get("content-length"));
        if (!response.ok || size > MAX_BYTES) return finish();
        const blob = await response.blob();
        if (disposed || finished) return;
        if (blob.size > MAX_BYTES || !blob.size) return finish();
        window.clearTimeout(deadline);
        blobUrl = URL.createObjectURL(blob);
        video.preload = "auto";
        video.src = blobUrl;
        video.load();
        deadline = window.setTimeout(finish, 2000);
      } catch {
        finish();
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
      void video.play().catch(finish);
    }

    function handlePlaying() {
      if (playing || finished || disposed) return;
      playing = true;
      window.clearTimeout(deadline);
      setPhase("playing");
      handleTime();
      if (typeof video.requestVideoFrameCallback === "function")
        videoFrame = video.requestVideoFrameCallback(handleVideoFrame);
      // The entrance always ends in less than five seconds, including stalls.
      presentation = window.setTimeout(finish, 4700);
    }

    function handleTime() {
      if (finished || !playing || !Number.isFinite(video.duration)) return;
      const progress = video.currentTime / video.duration;
      while (
        contentCue < CONTENT_CUES.length &&
        progress >= CONTENT_CUES[contentCue]
      ) {
        contentCue += 1;
        onCue(contentCue);
      }
      if (fading) return;
      // Establish the floating dust while the filmed powder is still visible,
      // so its disappearance never leaves a dark gap between the two layers.
      if (video.currentTime >= video.duration - 1.6) settle();
      if (video.currentTime >= video.duration - 0.75) {
        fading = true;
        setPhase("leaving");
        settle();
      }
    }

    function handleVideoFrame() {
      videoFrame = null;
      if (disposed || finished) return;
      handleTime();
      if (!disposed && !finished)
        videoFrame = video.requestVideoFrameCallback(handleVideoFrame);
    }

    function handleVisibility() {
      if (document.hidden) finish();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.35) schedule();
        else finish();
      },
      { threshold: [0, 0.35] },
    );

    video.addEventListener("canplay", handleCanPlay, { once: true });
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("timeupdate", handleTime);
    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);
    document.addEventListener("visibilitychange", handleVisibility);
    observer.observe(container);
    return () => {
      disposed = true;
      observer.disconnect();
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("timeupdate", handleTime);
      video.removeEventListener("ended", finish);
      video.removeEventListener("error", finish);
      document.removeEventListener("visibilitychange", handleVisibility);
      release();
    };
  }, [containerRef, completed, onSettled, onComplete, onCue]);

  if (phase === "done") return null;
  return (
    <div className="hero-atmosphere" data-phase={phase} aria-hidden="true">
      <video ref={videoRef} muted playsInline preload="none" tabIndex={-1} />
    </div>
  );
}
