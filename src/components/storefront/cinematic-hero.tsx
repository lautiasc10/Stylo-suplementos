"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { HeroAtmosphere } from "./hero-atmosphere";
import { HERO_COPY } from "./hero-copy";
import { HeroDust } from "./hero-dust";
import { useHomeIntro } from "./home-intro";
import { gazeFrameTime, gazeTime, HERO_VIDEO_FPS } from "./hero-gaze";

const VIDEO_URL = "/visuals/stylo-lion-motion-v3.mp4";
const POSTER_URL = "/visuals/stylo-lion-poster-v1.webp";
const CONTENT_CUES_MS = [0, 180, 520, 1000, 1220];

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
  const eyesId = useId();
  const { setWaiting, introSeen, claimIntro } = useHomeIntro();
  const introChoice = useRef<boolean | null>(introSeen ? false : null);
  const gazeUnlocked = useRef(introSeen);
  const resumeGaze = useRef<() => void>(() => {});
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTime = useRef(0);
  const submittedTime = useRef(0);
  const smoothedTime = useRef(0);
  const seeking = useRef(false);
  const active = useRef(false);
  const mediaReady = useRef(false);
  const animationFrame = useRef<number | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [dustReady, setDustReady] = useState(false);
  const [navigationReady, setNavigationReady] = useState(introSeen);
  const [contentStage, setContentStage] = useState(introSeen ? 5 : 0);
  const [contentInstant, setContentInstant] = useState(introSeen);
  const [playIntro, setPlayIntro] = useState(!introSeen);
  const [lionVisible, setLionVisible] = useState(introSeen);
  const [contentStarted, setContentStarted] = useState(false);
  const [brandVisible, setBrandVisible] = useState(false);
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
    setPlayIntro(false);
    setLionVisible(true);
    setDustReady(true);
    revealNavigation();
  }, [revealNavigation]);
  const completeScoop = useCallback(() => setPlayIntro(false), []);
  const revealLion = useCallback(() => setLionVisible(true), []);
  const handleAtmosphereSettled = useCallback(() => setDustReady(true), []);
  const revealBrand = useCallback(() => setBrandVisible(true), []);

  useEffect(() => {
    if (!contentStarted || contentInstant) return;
    // Start from the lion's actual animation end, retaining the existing text
    // order at a faster retail pace. The last button settles before navigation.
    const cues = CONTENT_CUES_MS.map((delay, index) =>
      window.setTimeout(() => advanceContent(index + 1), delay),
    );
    const navigation = window.setTimeout(revealNavigation, 1900);
    return () => {
      cues.forEach(window.clearTimeout);
      window.clearTimeout(navigation);
    };
  }, [contentStarted, contentInstant, advanceContent, revealNavigation]);

  useEffect(() => {
    if (contentInstant || navigationReady) return;
    // Bound both media preparation and the reveal in case media/CSS events
    // are unavailable. This is a fallback, never the normal animation clock.
    const fallback = window.setTimeout(revealAll, lionVisible ? 7000 : 8500);
    return () => window.clearTimeout(fallback);
  }, [contentInstant, navigationReady, lionVisible, revealAll]);

  useEffect(() => {
    const desktop = window.matchMedia(
      "(min-width: 801px) and (hover: hover) and (pointer: fine)",
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (introChoice.current === null) introChoice.current = claimIntro();
    function updateEligibility() {
      const saveData = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection?.saveData;
      const eligible = desktop.matches && !reduced.matches && !saveData;
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
      } else if (!introFinished.current) setWaiting(true);
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
    if (!videoEnabled) return;
    const hero = heroRef.current;
    const element = videoRef.current;
    if (!hero || !element) return;
    const video: HTMLVideoElement = element;
    let pointerProgress: number | null = null;
    let lastFrameTime = 0;
    let disposed = false;
    mediaReady.current = false;
    seeking.current = false;

    function cancelFrame() {
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      lastFrameTime = 0;
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
      const settled = Math.abs(difference) < 1 / (HERO_VIDEO_FPS * 8);
      // Keep the filter's fractional position even when no new source frame
      // is due. Rounding this accumulator caused a stall and snap near front.
      smoothedTime.current = settled
        ? targetTime.current
        : smoothedTime.current + difference * (1 - Math.exp(-elapsed / 55));
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
      smoothedTime.current = gazeTime(0.7, video.duration);
      submittedTime.current = gazeFrameTime(smoothedTime.current);
      targetTime.current =
        pointerProgress === null || !gazeUnlocked.current
          ? smoothedTime.current
          : gazeTime(pointerProgress, video.duration);
      seeking.current = true;
      video.currentTime = submittedTime.current;
    }

    function handleSeeked() {
      if (disposed) return;
      seeking.current = false;
      if (!mediaReady.current) {
        mediaReady.current = true;
        setVideoReady(true);
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
  }, [videoEnabled, revealAll]);

  return (
    <section
      className="sport-hero"
      ref={heroRef}
      aria-labelledby="hero-title"
      data-navigation={navigationReady ? "ready" : "waiting"}
      data-presentation={contentInstant ? "static" : "animated"}
      data-lion-visible={lionVisible}
    >
      <noscript>
        <style>{`.site-header,.category-navigation-shell,.hero-reveal,.hero-word,.sport-hero-visual{opacity:1!important;visibility:visible!important;transform:none!important;pointer-events:auto!important}.sport-hero-visual{transition:none!important}`}</style>
      </noscript>
      {videoEnabled && videoReady && (
        <>
          {playIntro && (
            <HeroAtmosphere
              containerRef={heroRef}
              onSettled={handleAtmosphereSettled}
              onComplete={completeScoop}
              onRevealLion={revealLion}
              onBrand={revealBrand}
              onUnavailable={revealAll}
            />
          )}
          <HeroDust containerRef={heroRef} enabled={dustReady} />
        </>
      )}
      {videoEnabled && !contentInstant && !contentStarted && (
        <>
          <svg
            className="hero-lion-eyes"
            viewBox="0 0 1440 812"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <radialGradient id={`${eyesId}-feather`}>
                <stop offset="0" stopColor="white" />
                <stop offset="0.55" stopColor="white" stopOpacity="0.85" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <mask id={`${eyesId}-mask`}>
                <ellipse
                  cx="689"
                  cy="256"
                  rx="43"
                  ry="17"
                  fill={`url(#${eyesId}-feather)`}
                />
                <ellipse
                  cx="841"
                  cy="257"
                  rx="35"
                  ry="16"
                  fill={`url(#${eyesId}-feather)`}
                />
              </mask>
            </defs>
            <image
              href={POSTER_URL}
              width="1440"
              height="812"
              mask={`url(#${eyesId}-mask)`}
            />
          </svg>
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
                sizes="40vw"
              />
            </span>
          </div>
        </>
      )}
      <div
        className="sport-hero-visual"
        aria-hidden="true"
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.animationName === "hero-lion-emerge"
          ) {
            gazeUnlocked.current = true;
            resumeGaze.current();
            setContentStarted(true);
          }
        }}
      >
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
        {videoEnabled && (
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
              data-revealed={contentStage >= 5}
            >
              Explorar tienda
            </Link>
            <a
              href="#destacados"
              className="hero-pill hero-pill-secondary hero-reveal"
              data-revealed={contentStage >= 4}
            >
              Ver destacados
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
