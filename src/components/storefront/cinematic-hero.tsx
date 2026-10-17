"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categories as defaultCategories } from "@/modules/catalog/categories";
import {
  HeroCategoryMarquee,
  type HeroCategory,
} from "./hero-category-marquee";
import { HeroCursorLight } from "./hero-cursor-light";
import { HERO_COPY } from "./hero-copy";
import { HeroDust } from "./hero-dust";
import { useHomeIntro } from "./home-intro";
import {
  advanceGaze,
  gazeFrameTime,
  gazeTime,
  HERO_VIDEO_FPS,
} from "./hero-gaze";

const VIDEO_URL = "/visuals/stylo-lion-motion-v3.mp4";
const POSTER_URL = "/visuals/stylo-lion-poster-right-v1.webp";
// Use the supplied source pose and matching poster. Never mirror or redraw it.
const INITIAL_GAZE = 0.95;

export function CinematicHero({
  categories = defaultCategories,
}: {
  categories?: readonly HeroCategory[];
}) {
  const { setWaiting, claimIntro } = useHomeIntro();
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTime = useRef(0);
  const submittedTime = useRef(0);
  const smoothedTime = useRef(0);
  const gazeVelocity = useRef(0);
  const seeking = useRef(false);
  const active = useRef(false);
  const mediaReady = useRef(false);
  const animationFrame = useRef<number | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [presentation, setPresentation] = useState("static");
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [ambientActive, setAmbientActive] = useState(true);

  useEffect(() => {
    const desktop = window.matchMedia(
      "(min-width: 801px) and (hover: hover) and (pointer: fine)",
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const firstVisit = claimIntro();
    let firstPass = true;
    // The header, text and shopping actions are available from the server HTML.
    setWaiting(false);
    function updateEligibility() {
      const connection = (
        navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string };
        }
      ).connection;
      const eligible =
        desktop.matches &&
        !reduced.matches &&
        !connection?.saveData &&
        !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
      setVideoEnabled(eligible);
      if (!eligible) setVideoReady(false);
      if (firstPass) {
        setPresentation(
          firstVisit &&
            eligible &&
            window.scrollY < 8 &&
            !document.activeElement?.matches(
              "a,button,input,select,textarea,[tabindex]",
            )
            ? "animated"
            : "static",
        );
        firstPass = false;
      } else setPresentation("static");
    }
    updateEligibility();
    desktop.addEventListener("change", updateEligibility);
    reduced.addEventListener("change", updateEligibility);
    return () => {
      setWaiting(false);
      desktop.removeEventListener("change", updateEligibility);
      reduced.removeEventListener("change", updateEligibility);
    };
  }, [setWaiting, claimIntro]);

  useEffect(() => {
    if (!videoEnabled || videoFailed) return;
    const hero = heroRef.current;
    const element = videoRef.current;
    if (!hero || !element) return;
    const video: HTMLVideoElement = element;
    let pointerProgress: number | null = null;
    let lastFrameTime = 0;
    let disposed = false;
    let firstVideoFrame: number | null = null;
    let firstFrameDeadline: number | undefined;
    mediaReady.current = false;
    seeking.current = false;

    function cancelFrame() {
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      lastFrameTime = 0;
      gazeVelocity.current = 0;
    }

    function scheduleFrame() {
      if (
        disposed ||
        !active.current ||
        document.hidden ||
        !mediaReady.current ||
        seeking.current ||
        animationFrame.current !== null
      )
        return;
      animationFrame.current = window.requestAnimationFrame(presentFrame);
    }

    function presentFrame(now: number) {
      animationFrame.current = null;
      if (disposed || !active.current || document.hidden || seeking.current)
        return;
      const difference = targetTime.current - smoothedTime.current;
      const elapsed = lastFrameTime
        ? Math.min(now - lastFrameTime, 80)
        : 1000 / 60;
      const settled =
        Math.abs(difference) < 1 / (HERO_VIDEO_FPS * 8) &&
        Math.abs(gazeVelocity.current) < 0.02;
      // Keep a fractional accumulator, but bound velocity through the entire
      // turn. Unlocking a distant cursor target must not jump over its poses.
      const next = settled
        ? { position: targetTime.current, velocity: 0 }
        : advanceGaze(
            smoothedTime.current,
            gazeVelocity.current,
            targetTime.current,
            elapsed,
          );
      smoothedTime.current = next.position;
      gazeVelocity.current = next.velocity;
      const nextTime = gazeFrameTime(smoothedTime.current);
      lastFrameTime = now;
      if (Math.abs(nextTime - submittedTime.current) < 0.001) {
        if (settled) lastFrameTime = 0;
        else scheduleFrame();
        return;
      }
      submittedTime.current = nextTime;
      seeking.current = true;
      try {
        video.currentTime = submittedTime.current;
      } catch {
        handleError();
      }
    }

    function handleMetadata() {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      video.pause();
      smoothedTime.current = gazeTime(INITIAL_GAZE, video.duration);
      gazeVelocity.current = 0;
      submittedTime.current = gazeFrameTime(smoothedTime.current);
      targetTime.current = smoothedTime.current;
      seeking.current = true;
      if (typeof video.requestVideoFrameCallback === "function") {
        const confirmFrame: VideoFrameRequestCallback = (_now, metadata) => {
          firstVideoFrame = null;
          if (disposed) return;
          if (
            Math.abs(metadata.mediaTime - submittedTime.current) <
            2 / HERO_VIDEO_FPS
          ) {
            markMediaReady();
          } else
            firstVideoFrame = video.requestVideoFrameCallback(confirmFrame);
        };
        firstVideoFrame = video.requestVideoFrameCallback(confirmFrame);
        // Keep the matching poster if a decoder never presents its first pose.
        firstFrameDeadline = window.setTimeout(handleError, 2500);
      }
      video.currentTime = submittedTime.current;
    }

    function markMediaReady() {
      if (disposed || mediaReady.current) return;
      window.clearTimeout(firstFrameDeadline);
      if (firstVideoFrame !== null) {
        video.cancelVideoFrameCallback(firstVideoFrame);
        firstVideoFrame = null;
      }
      mediaReady.current = true;
      setVideoReady(true);
      if (pointerProgress !== null)
        targetTime.current = gazeTime(pointerProgress, video.duration);
      scheduleFrame();
    }

    function handleSeeked() {
      if (disposed) return;
      seeking.current = false;
      if (typeof video.requestVideoFrameCallback !== "function")
        markMediaReady();
      else if (!mediaReady.current) {
        // Some compositors suppress presentation callbacks for opacity:0
        // videos. A confirmed seek plus a drawable decoded frame is the
        // bounded fallback. The matched frame replaces the poster atomically.
        window.clearTimeout(firstFrameDeadline);
        firstFrameDeadline = window.setTimeout(() => {
          if (disposed || mediaReady.current) return;
          if (
            video.readyState >= video.HAVE_CURRENT_DATA &&
            Math.abs(video.currentTime - submittedTime.current) <
              2 / HERO_VIDEO_FPS
          )
            markMediaReady();
          else handleError();
        }, 160);
      }
      scheduleFrame();
    }

    function handleError() {
      if (disposed) return;
      cancelFrame();
      setVideoReady(false);
      setVideoFailed(true);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        active.current = entry.intersectionRatio >= 0.35;
        setAmbientActive(active.current && !document.hidden);
        if (active.current) scheduleFrame();
        else cancelFrame();
      },
      { threshold: [0, 0.35, 1] },
    );
    observer.observe(hero);

    function handleMove(event: MouseEvent) {
      if (!active.current || document.hidden) return;
      pointerProgress = Math.max(
        0,
        Math.min(1, event.clientX / window.innerWidth),
      );
      if (!Number.isFinite(video.duration)) return;
      targetTime.current = gazeTime(pointerProgress, video.duration);
      scheduleFrame();
    }

    function handleVisibility() {
      setAmbientActive(active.current && !document.hidden);
      if (document.hidden) cancelFrame();
      else scheduleFrame();
    }

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    video.src = VIDEO_URL;
    video.load();
    return () => {
      disposed = true;
      observer.disconnect();
      cancelFrame();
      window.clearTimeout(firstFrameDeadline);
      if (firstVideoFrame !== null)
        video.cancelVideoFrameCallback(firstVideoFrame);
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
      active.current = false;
      seeking.current = false;
      mediaReady.current = false;
    };
  }, [videoEnabled, videoFailed]);

  return (
    <section
      className="sport-hero editorial-hero"
      ref={heroRef}
      aria-labelledby="hero-title"
      data-navigation="ready"
      data-presentation={presentation}
      data-enhanced={videoEnabled}
      data-ambient-paused={ambientPaused || !ambientActive}
    >
      {videoEnabled && (
        <HeroDust
          containerRef={heroRef}
          enabled
          onPauseChange={setAmbientPaused}
          controlLabel="animación del hero"
        />
      )}
      <HeroCursorLight
        containerRef={heroRef}
        enabled={videoEnabled && !ambientPaused && ambientActive}
      />
      <div
        className="sport-hero-visual"
        aria-hidden="true"
        data-video-ready={videoReady}
      >
        <div className="hero-lion-ambient">
          <div className="sport-hero-poster">
            <Image
              src={POSTER_URL}
              alt=""
              fill
              priority
              unoptimized
              sizes="(max-width: 800px) 100vw, 70vw"
            />
          </div>
          {videoEnabled && !videoFailed && (
            <video
              ref={videoRef}
              className={videoReady ? "is-ready" : ""}
              muted
              playsInline
              preload="auto"
              poster={POSTER_URL}
            />
          )}
        </div>
      </div>
      <div className="container sport-hero-inner">
        <div className="hero-content">
          <p className="hero-eyebrow">{HERO_COPY.eyebrow}</p>
          <h1 id="hero-title" className="hero-title">
            <span className="hero-title-line hero-title-outline">
              {HERO_COPY.titleLines[0]}
            </span>{" "}
            <span className="hero-title-line">{HERO_COPY.titleLines[1]}</span>{" "}
            <span className="hero-title-line hero-title-gold">
              {HERO_COPY.titleLines[2]}
            </span>
          </h1>
          <div className="hero-bottom-row">
            <p className="hero-subtitle">{HERO_COPY.subtitle}</p>
            <div className="hero-actions">
              <Link href="/catalogo" className="hero-pill hero-pill-primary">
                Explorar tienda <span aria-hidden="true">↗</span>
              </Link>
              <a href="#destacados" className="hero-pill hero-pill-secondary">
                Ver destacados <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <HeroCategoryMarquee categories={categories} />
    </section>
  );
}
