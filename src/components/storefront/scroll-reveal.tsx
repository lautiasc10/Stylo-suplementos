"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Content is visible in server HTML. Motion is an optional enhancement.
export function ScrollReveal({ children, className = "", stagger = false }: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    function setup() {
      observer?.disconnect();
      delete element!.dataset.reveal;
      if (preference.matches || element!.contains(document.activeElement)) return;
      if (element!.getBoundingClientRect().top < window.innerHeight - 32) return;
      element!.dataset.reveal = "pending";
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          if (element!.dataset.reveal === "pending") element!.dataset.reveal = "visible";
          observer?.disconnect();
        }
      }, { rootMargin: "0px 0px -32px 0px", threshold: 0.05 });
      observer.observe(element!);
    }
    setup();
    preference.addEventListener("change", setup);
    return () => { observer?.disconnect(); preference.removeEventListener("change", setup); };
  }, []);
  return <div ref={ref} className={`scroll-reveal ${stagger ? "reveal-stagger" : ""} ${className}`} onFocusCapture={() => {
    // Keyboard navigation must never land inside a hidden group.
    if (ref.current) delete ref.current.dataset.reveal;
  }}>{children}</div>;
}

const tagline = ["Lo", "que", "nos", "mueve", "es", "tu", "constancia."];

export function BrandTagline() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const heading = ref.current;
    if (!heading || !window.IntersectionObserver) return;
    const words = Array.from(heading.querySelectorAll<HTMLElement>(".tagline-word"));
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    function setup() {
      observer?.disconnect();
      words.forEach(word => { delete word.dataset.wordReveal; });
      if (preference.matches || heading!.getBoundingClientRect().top < window.innerHeight - 32) return;
      words.forEach(word => { word.dataset.wordReveal = "pending"; });
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.wordReveal = "visible";
            observer?.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -32px 0px" });
      words.forEach(word => observer!.observe(word));
    }
    setup();
    preference.addEventListener("change", setup);
    return () => { observer?.disconnect(); preference.removeEventListener("change", setup); };
  }, []);
  return <h2 ref={ref} className="brand-tagline">{tagline.map((word, index) => <span key={word}>
    <span className="tagline-word" style={{ transitionDelay: `${index * 80}ms` }}>{word}</span>{index === 3 ? <br /> : " "}
  </span>)}</h2>;
}
