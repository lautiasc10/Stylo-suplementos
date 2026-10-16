"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { HeroAtmosphere } from "./hero-atmosphere";
import { HERO_COPY } from "./hero-copy";
import { HeroDust } from "./hero-dust";
import { useHomeIntro } from "./home-intro";
import { HERO_SEQUENCE } from "./hero-sequence";
import {
  advanceGaze,
  gazeFrameTime,
  gazeTime,
  HERO_VIDEO_FPS,
} from "./hero-gaze";

const VIDEO_URL = "/visuals/stylo-lion-motion-v3.mp4";
const POSTER_URL = "/visuals/stylo-lion-poster-right-v1.webp";
// The source already contains this pose. Keep the poster and first decoded
// frame identical; never mirror the lion or its lettering/watermark.
const INITIAL_GAZE = 0.95;

function HeroWords({
  text,
  accentFrom,
}: {
  text: string;
  accentFrom?: number;
}) {
  return text.split(" ").map((word, index) => (
    <Fragment key={`${index}-${word}`}>
      {index > 0 && " "}
      <span
        className="hero-word"
        data-accent={
          accentFrom !== undefined && index >= accentFrom ? "true" : undefined
        }
      >
        {word}
      </span>
    </Fragment>
  ));
}

export function CinematicHero() {
  const { setWaiting, introSeen, claimIntro } = useHomeIntro();
  const introChoice = useRef<boolean | null>(introSeen ? false : null);
  const gazeUnlocked = useRef(introSeen);
  const resumeGaze = useRef<() => void>(() => {});
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
  const [prepareLion, setPrepareLion] = useState(introSeen);
  const [dustReady, setDustReady] = useState(false);
  const [navigationReady, setNavigationReady] = useState(introSeen);
  const [contentStage, setContentStage] = useState(introSeen ? 5 : 0);
  const [contentInstant, setContentInstant] = useState(introSeen);
  const [playIntro, setPlayIntro] = useState(!introSeen);
  const [lionVisible, setLionVisible] = useState(introSeen);
  const [contentStarted, setContentStarted] = useState(false);
  const [brandVisible, setBrandVisible] = useState(false);
  const [sequenceStartedAt, setSequenceStartedAt] = useState<number | null>(
    null,
  );
  const [entranceDone, setEntranceDone] = useState(introSeen);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [ambientActive, setAmbientActive] = useState(true);
  const advanceContent = useCallback((stage: number) => {
    setContentStage((previous) => Math.max(previous, stage));
  }, []);
  const introFinished = useRef(false);
  const revealNavigation = useCallback(() => {
    introFinished.current = true;
    setNavigationReady(true);
    setWaiting(false);
    advanceContent(5);
  }, [setWaiting, advanceContent]);
  const revealAll = useCallback(() => {
    gazeUnlocked.current = true;
    resumeGaze.current();
    setContentInstant(true);
    setPrepareLion(true);
    setPlayIntro(false);
    setLionVisible(true);
    setDustReady(true);
    setEntranceDone(true);
    revealNavigation();
  }, [revealNavigation]);

  useEffect(() => {
    if (sequenceStartedAt === null || contentInstant) return;
    const timers: number[] = [];
    const cue = (at: number, action: () => void) =>
      timers.push(
        window.setTimeout(
          action,
          Math.max(0, at - (performance.now() - sequenceStartedAt)),
        ),
      );
    cue(HERO_SEQUENCE.lion, () => {
      setDustReady(true);
      setLionVisible(true);
    });
    cue(HERO_SEQUENCE.scoopEnd, () => {
      setPlayIntro(false);
      setContentStarted(true);
    });
    HERO_SEQUENCE.content.forEach((at, index) =>
      cue(at, () => advanceContent(index + 1)),
    );
    cue(HERO_SEQUENCE.navigation, revealNavigation);
    cue(HERO_SEQUENCE.complete, () => {
      setEntranceDone(true);
      setPrepareLion(true);
      gazeUnlocked.current = true;
      resumeGaze.current();
      revealNavigation();
    });
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [sequenceStartedAt, contentInstant, advanceContent, revealNavigation]);

  useEffect(() => {
    const desktop = window.matchMedia(
      "(min-width: 801px) and (hover: hover) and (pointer: fine)",
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (introChoice.current === null) introChoice.current = claimIntro();
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
      if (
        !eligible ||
        !introChoice.current ||
        introFinished.current ||
        document.activeElement?.matches(
          "a,button,input,select,textarea,[tabindex]",
        ) ||
        window.scrollY > 8 ||
        (window.location.hash && window.location.hash !== "#inicio")
      ) {
        revealAll();
        if (eligible) setDustReady(true);
      } else if (!introFinished.current) {
        setWaiting(true);
        setBrandVisible(true);
        setSequenceStartedAt((previous) => previous ?? performance.now());
      }
      if (!eligible) {
        setVideoReady(false);
        setDustReady(false);
      }
    }
    updateEligibility();
    function revealForKeyboard(event: KeyboardEvent) {
      if (
        event.key === "Tab" ||
        event.key === "Escape" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")
      )
        revealAll();
    }
    function revealForScroll() {
      if (window.scrollY > 8) revealAll();
    }
    function revealForVisibility() {
      if (document.hidden && !introFinished.current) revealAll();
    }
    window.addEventListener("keydown", revealForKeyboard);
    window.addEventListener("scroll", revealForScroll, { passive: true });
    document.addEventListener("visibilitychange", revealForVisibility);
    desktop.addEventListener("change", updateEligibility);
    reduced.addEventListener("change", updateEligibility);
    return () => {
      window.removeEventListener("keydown", revealForKeyboard);
      window.removeEventListener("scroll", revealForScroll);
      document.removeEventListener("visibilitychange", revealForVisibility);
      setWaiting(false);
      desktop.removeEventListener("change", updateEligibility);
      reduced.removeEventListener("change", updateEligibility);
    };
  }, [revealAll, setWaiting, claimIntro]);

  useEffect(() => {
    if (!videoEnabled || !prepareLion) return;
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
      targetTime.current =
        pointerProgress === null || !gazeUnlocked.current
          ? smoothedTime.current
          : gazeTime(pointerProgress, video.duration);
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
        // bounded fallback; the poster stays underneath the 240 ms fade.
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
      setVideoEnabled(false);
      setDustReady(false);
      revealAll();
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
      if (!gazeUnlocked.current) return;
      if (!Number.isFinite(video.duration)) return;
      targetTime.current = gazeTime(pointerProgress, video.duration);
      scheduleFrame();
    }

    function handleVisibility() {
      setAmbientActive(active.current && !document.hidden);
      if (document.hidden) cancelFrame();
      else scheduleFrame();
    }

    resumeGaze.current = () => {
      if (pointerProgress !== null && Number.isFinite(video.duration)) {
        targetTime.current = gazeTime(pointerProgress, video.duration);
        scheduleFrame();
      }
    };

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    video.src = VIDEO_URL;
    video.load();
    return () => {
      disposed = true;
      resumeGaze.current = () => {};
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
  }, [videoEnabled, prepareLion, revealAll]);

  return (
    <section
      className="sport-hero"
      ref={heroRef}
      aria-labelledby="hero-title"
      data-navigation={navigationReady ? "ready" : "waiting"}
      data-presentation={contentInstant ? "static" : "animated"}
      data-lion-visible={lionVisible}
      data-intro-start={sequenceStartedAt ?? undefined}
      data-entrance-complete={entranceDone}
      data-ambient-paused={ambientPaused || !ambientActive}
    >
      <noscript>
        <style>{`.site-header,.category-navigation-shell,.hero-reveal,.hero-word,.sport-hero-visual{opacity:1!important;visibility:visible!important;transform:none!important;pointer-events:auto!important}.sport-hero-visual{transition:none!important}`}</style>
      </noscript>
      {videoEnabled && (
        <>
          {playIntro && sequenceStartedAt !== null && (
            <HeroAtmosphere
              startedAt={sequenceStartedAt}
              leaving={lionVisible}
            />
          )}
          <HeroDust
            containerRef={heroRef}
            enabled={dustReady}
            onPauseChange={setAmbientPaused}
          />
        </>
      )}
      {videoEnabled && !contentInstant && !contentStarted && (
        <>
          <div
            className="hero-intro-brand"
            data-state={
              brandVisible ? (lionVisible ? "leaving" : "visible") : "hidden"
            }
            aria-hidden="true"
          >
            <span>
              <Image
                src="/branding/stylo-suplementos.svg"
                alt=""
                width={981}
                height={236}
                unoptimized
                sizes="(min-width: 1600px) 480px, 30vw"
              />
            </span>
          </div>
        </>
      )}
      <div className="sport-hero-visual" aria-hidden="true">
        <div className="hero-lion-ambient">
          <div className="sport-hero-poster">
            <Image
              src={POSTER_URL}
              alt=""
              fill
              priority
              unoptimized
              sizes="100vw"
            />
          </div>
          {videoEnabled && prepareLion && (
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
        <div
          className="hero-content"
          data-sequence={contentInstant ? "static" : "active"}
          data-content-stage={contentStage}
        >
          <p
            className="hero-eyebrow hero-reveal hero-text"
            data-revealed={contentStage >= 1}
          >
            <HeroWords text={HERO_COPY.eyebrow} />
          </p>
          <h1
            id="hero-title"
            className="hero-title hero-reveal hero-text"
            data-revealed={contentStage >= 2}
          >
            <HeroWords text={HERO_COPY.title} accentFrom={3} />
          </h1>
          <p
            className="hero-subtitle hero-reveal hero-text"
            data-revealed={contentStage >= 3}
          >
            <HeroWords text={HERO_COPY.subtitle} />
          </p>
          <div className="hero-actions">
            <Link
              href="/catalogo"
              className="hero-pill hero-pill-primary hero-reveal"
              data-revealed={contentStage >= 4}
            >
              Explorar tienda
            </Link>
            <a
              href="#destacados"
              className="hero-pill hero-pill-secondary hero-reveal"
              data-revealed={contentStage >= 5}
            >
              Ver destacados
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
