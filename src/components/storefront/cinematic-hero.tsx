"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { HeroAtmosphere } from "./hero-atmosphere";
import { HeroDust } from "./hero-dust";
import { useHomeIntro } from "./home-intro";
import { gazeFrameTime, gazeTime, HERO_VIDEO_FPS } from "./hero-gaze";

const VIDEO_URL = "/visuals/stylo-lion-motion-v3.mp4";
const POSTER_URL = "/visuals/stylo-lion-poster-v1.webp";
const MESSAGE = "Potenciá tu mejor versión.";

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
        style={{ "--word-delay": `${index * 55}ms` } as CSSProperties}
      >
        {word}
      </span>
    </Fragment>
  ));
}

export function CinematicHero() {
  const { setWaiting, introSeen, claimIntro } = useHomeIntro();
  const introChoice = useRef<boolean | null>(introSeen ? false : null);
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
  const [contentStage, setContentStage] = useState(introSeen ? 6 : 0);
  const [contentInstant, setContentInstant] = useState(introSeen);
  const [playIntro, setPlayIntro] = useState(!introSeen);
  const [lionVisible, setLionVisible] = useState(introSeen);
  const advanceContent = useCallback((stage: number) => {
    setContentStage((previous) => Math.max(previous, stage));
  }, []);
  const introFinished = useRef(false);
  const revealNavigation = useCallback(() => {
    introFinished.current = true;
    setNavigationReady(true);
    setWaiting(false);
    advanceContent(6);
  }, [setWaiting, advanceContent]);
  const revealAll = useCallback(() => {
    setContentInstant(true);
    setPlayIntro(false);
    setLionVisible(true);
    setDustReady(true);
    revealNavigation();
  }, [revealNavigation]);
  const completePresentation = useCallback(() => {
    setLionVisible(true);
    setPlayIntro(false);
    revealNavigation();
  }, [revealNavigation]);
  const handleAtmosphereSettled = useCallback(() => setDustReady(true), []);

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
    const fallback = window.setTimeout(revealAll, 8500);
    function revealForKeyboard(event: KeyboardEvent) {
      if (event.key === "Tab" || event.key === "Escape") revealAll();
    }
    function revealForScroll() {
      if (window.scrollY > 8) revealAll();
    }
    window.addEventListener("keydown", revealForKeyboard);
    window.addEventListener("scroll", revealForScroll, { passive: true });
    desktop.addEventListener("change", updateEligibility);
    reduced.addEventListener("change", updateEligibility);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("keydown", revealForKeyboard);
      window.removeEventListener("scroll", revealForScroll);
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
        pointerProgress === null
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
      if (!Number.isFinite(video.duration)) return;
      targetTime.current = gazeTime(pointerProgress, video.duration);
      scheduleFrame();
    }

    function handleVisibility() {
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
              onComplete={completePresentation}
              onCue={advanceContent}
            />
          )}
          <HeroDust containerRef={heroRef} enabled={dustReady} />
        </>
      )}
      <div className="sport-hero-visual" aria-hidden="true">
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
          <h1
            id="hero-title"
            className="hero-intro hero-reveal hero-text"
            data-revealed={contentStage >= 1}
          >
            <HeroWords text="Bienvenido a STYLO SUPLEMENTOS" accentFrom={2} />
          </h1>
          <p
            className="hero-description hero-reveal hero-text"
            data-revealed={contentStage >= 2}
          >
            <HeroWords text="Una nueva experiencia está por comenzar." />
          </p>
          <div className="hero-typewriter-slot">
            <p
              className="hero-typewriter hero-reveal hero-text"
              data-revealed={contentStage >= 3}
            >
              <HeroWords text={MESSAGE} />
            </p>
          </div>
          <div className="hero-actions">
            <Link
              href="/catalogo"
              className="hero-pill hero-pill-primary hero-reveal"
              data-revealed={contentStage >= 6}
            >
              Explorar tienda
            </Link>
            <a
              href="#categorias"
              className="hero-pill hero-pill-secondary hero-reveal"
              data-revealed={contentStage >= 5}
            >
              Ver productos destacados
            </a>
            <Link
              href="/nosotros"
              className="hero-pill hero-pill-outline hero-reveal"
              data-revealed={contentStage >= 4}
            >
              Conocé STYLO
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
