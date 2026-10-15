"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeroAtmosphere } from "./hero-atmosphere";

const VIDEO_URL = "/visuals/stylo-lion-motion-v2.mp4";
const POSTER_URL = "/visuals/stylo-lion-poster-v1.webp";
const VIDEO_FPS = 24;
const GAZE_ORIGIN = 0.7;
const MESSAGE = "Potenciá tu mejor versión.";

function useTypewriter({
  text,
  speed = 38,
  startDelay = 600,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
}): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let delay: number | undefined;
    let interval: number | undefined;

    function stopTimers() {
      window.clearTimeout(delay);
      window.clearInterval(interval);
    }

    function start() {
      stopTimers();
      if (preference.matches) {
        setDisplayed(text);
        setDone(true);
        return;
      }
      setDisplayed("");
      setDone(false);
      let characters = 0;
      delay = window.setTimeout(() => {
        interval = window.setInterval(() => {
          characters += 1;
          setDisplayed(text.slice(0, characters));
          if (characters >= text.length) {
            window.clearInterval(interval);
            setDone(true);
          }
        }, speed);
      }, startDelay);
    }

    start();
    preference.addEventListener("change", start);
    return () => {
      stopTimers();
      preference.removeEventListener("change", start);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

export function CinematicHero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTime = useRef(0);
  const submittedTime = useRef(0);
  const seeking = useRef(false);
  const active = useRef(false);
  const mediaReady = useRef(false);
  const animationFrame = useRef<number | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const { displayed, done } = useTypewriter({ text: MESSAGE });

  useEffect(() => {
    const desktop = window.matchMedia(
      "(min-width: 801px) and (hover: hover) and (pointer: fine)",
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function updateEligibility() {
      const saveData = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection?.saveData;
      const eligible = desktop.matches && !reduced.matches && !saveData;
      setVideoEnabled(eligible);
      if (!eligible) {
        setVideoReady(false);
      }
    }
    updateEligibility();
    desktop.addEventListener("change", updateEligibility);
    reduced.addEventListener("change", updateEligibility);
    return () => {
      desktop.removeEventListener("change", updateEligibility);
      reduced.removeEventListener("change", updateEligibility);
    };
  }, []);

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

    function timeForPointer(progress: number) {
      // Exclude the held poses at the ends. The neutral gaze is aligned with
      // the lion on the right, rather than the middle of the whole screen.
      const firstFrame = video.duration * 0.15;
      const lastFrame = video.duration - firstFrame;
      const centerFrame =
        Math.round((video.duration / 2) * VIDEO_FPS) / VIDEO_FPS;
      const time =
        progress <= GAZE_ORIGIN
          ? centerFrame +
            (lastFrame - centerFrame) * (1 - progress / GAZE_ORIGIN)
          : centerFrame -
            (centerFrame - firstFrame) *
              ((progress - GAZE_ORIGIN) / (1 - GAZE_ORIGIN));
      return Math.round(time * VIDEO_FPS) / VIDEO_FPS;
    }

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
      const difference = targetTime.current - submittedTime.current;
      if (Math.abs(difference) < 1 / (VIDEO_FPS * 2)) {
        lastFrameTime = 0;
        return;
      }
      // A short, time-based ease follows the latest pointer position. At most
      // one seek is in flight; stale mouse positions never form a queue.
      const elapsed = lastFrameTime
        ? Math.min(now - lastFrameTime, 80)
        : 1000 / 60;
      const eased =
        Math.abs(difference) < 0.12
          ? targetTime.current
          : submittedTime.current + difference * (1 - Math.exp(-elapsed / 55));
      const nextTime = Math.round(eased * VIDEO_FPS) / VIDEO_FPS;
      if (nextTime === submittedTime.current) {
        submittedTime.current = targetTime.current;
      } else {
        submittedTime.current = nextTime;
      }
      lastFrameTime = now;
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
      submittedTime.current =
        Math.round((video.duration / 2) * VIDEO_FPS) / VIDEO_FPS;
      targetTime.current =
        pointerProgress === null
          ? submittedTime.current
          : timeForPointer(pointerProgress);
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
      targetTime.current = timeForPointer(pointerProgress);
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
  }, [videoEnabled]);

  return (
    <section className="sport-hero" ref={heroRef} aria-labelledby="hero-title">
      {videoEnabled && videoReady && <HeroAtmosphere containerRef={heroRef} />}
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
        <div className="hero-content">
          <h1 id="hero-title" className="hero-intro">
            Bienvenido a <span>STYLO SUPLEMENTOS</span>
          </h1>
          <p className="hero-description">
            Una nueva experiencia está por comenzar.
          </p>
          <div className="hero-typewriter-slot">
            <p className="hero-typewriter" aria-hidden="true">
              {displayed}
              {!done && <span className="hero-cursor" />}
            </p>
            <noscript>
              <p className="hero-typewriter-static">{MESSAGE}</p>
            </noscript>
            <span className="sr-only">{MESSAGE}</span>
          </div>
          <div className="hero-actions">
            <Link href="/catalogo" className="hero-pill hero-pill-primary">
              Explorar tienda
            </Link>
            <a href="#categorias" className="hero-pill hero-pill-secondary">
              Ver productos destacados
            </a>
            <Link href="/nosotros" className="hero-pill hero-pill-outline">
              Conocé STYLO
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
