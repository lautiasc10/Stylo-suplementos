"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const VIDEO_URL = "/visuals/stylo-lion-motion-v1.mp4";
const POSTER_URL = "/visuals/stylo-lion-poster-v1.webp";
const SENSITIVITY = 0.8;
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
  const previousX = useRef<number | null>(null);
  const seeking = useRef(false);
  const active = useRef(false);
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
        previousX.current = null;
        seeking.current = false;
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

  function seekToTarget() {
    const video = videoRef.current;
    if (!video || seeking.current || !Number.isFinite(video.duration)) return;
    if (Math.abs(video.currentTime - targetTime.current) < 1 / 60) {
      setVideoReady(true);
      return;
    }
    seeking.current = true;
    try {
      video.currentTime = targetTime.current;
    } catch {
      seeking.current = false;
      setVideoEnabled(false);
    }
  }

  function handleMetadata() {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0)
      return;
    video.pause();
    targetTime.current = video.duration / 2;
    seekToTarget();
  }

  function handleSeeked() {
    seeking.current = false;
    seekToTarget();
  }

  useEffect(() => {
    if (!videoEnabled) return;
    const hero = heroRef.current;
    const video = videoRef.current;
    if (!hero || !video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        active.current = entry.intersectionRatio >= 0.35;
        if (!active.current) previousX.current = null;
      },
      { threshold: [0, 0.35, 1] },
    );
    observer.observe(hero);

    function handleMove(event: MouseEvent) {
      if (!active.current || document.hidden) return;
      const interactive = (event.target as Element | null)?.closest?.(
        "a, button, input, select, textarea",
      );
      const currentX = event.clientX;
      const lastX = previousX.current;
      previousX.current = currentX;
      if (interactive || lastX === null || !videoReady) return;
      const duration = videoRef.current?.duration;
      if (
        typeof duration !== "number" ||
        !Number.isFinite(duration) ||
        duration <= 0
      )
        return;
      const offset =
        ((currentX - lastX) / window.innerWidth) * SENSITIVITY * duration;
      targetTime.current = Math.max(
        0,
        Math.min(duration, targetTime.current + offset),
      );
      seekToTarget();
    }

    function handleVisibility() {
      if (document.hidden) previousX.current = null;
    }

    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      observer.disconnect();
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      video.pause();
      previousX.current = null;
      active.current = false;
      seeking.current = false;
    };
  }, [videoEnabled, videoReady]);

  return (
    <section className="sport-hero" ref={heroRef} aria-labelledby="hero-title">
      <div className="sport-hero-visual" aria-hidden="true">
        <div className="sport-hero-poster">
          <Image src={POSTER_URL} alt="" fill priority sizes="100vw" />
        </div>
        {videoEnabled && (
          <video
            ref={videoRef}
            src={VIDEO_URL}
            className={videoReady ? "is-ready" : ""}
            muted
            playsInline
            preload="auto"
            poster={POSTER_URL}
            onLoadedMetadata={handleMetadata}
            onSeeked={handleSeeked}
            onError={() => setVideoEnabled(false)}
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
