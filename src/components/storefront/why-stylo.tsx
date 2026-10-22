"use client";

import { useEffect, useRef } from "react";
import { useMotionPreference } from "@/components/ui/use-motion-preference";

type Stat = { value: number; label: string };
const COUNT_DURATION = 1800;
const format = new Intl.NumberFormat("es-AR");
let completedThisVisit = false;

/** Lovable's cubic count-up, using only current public catalog counts. */
export function WhyStylo({ stats }: { stats: Stat[] }) {
  const root = useRef<HTMLElement>(null);
  const entered = useRef(false);
  const reduced = useMotionPreference();

  useEffect(() => {
    const section = root.current;
    if (!section) return;
    const numbers = section.querySelectorAll<HTMLElement>("[data-stat-number]");
    const final = () =>
      numbers.forEach((node, index) => {
        node.textContent = format.format(stats[index].value);
      });
    if (reduced !== false || entered.current || completedThisVisit || !window.IntersectionObserver) {
      final();
      section.dataset.counting = "done";
      return;
    }
    let frame = 0;
    let started = 0;
    section.dataset.counting = "pending";
    numbers.forEach((node) => {
      node.textContent = "0";
    });
    function step(now: number) {
      started ||= now;
      const progress = Math.min(1, (now - started) / COUNT_DURATION);
      const eased = 1 - (1 - progress) ** 3;
      numbers.forEach((node, index) => {
        node.textContent = format.format(
          Math.round(stats[index].value * eased),
        );
      });
      if (progress < 1) frame = requestAnimationFrame(step);
      else {
        section!.dataset.counting = "done";
        completedThisVisit = true;
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || entered.current) return;
        entered.current = true;
        section.dataset.counting = "running";
        frame = requestAnimationFrame(step);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(section);
    const visibility = () => {
      if (!document.hidden || !entered.current) return;
      cancelAnimationFrame(frame);
      final();
      section.dataset.counting = "done";
      completedThisVisit = true;
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [reduced, stats]);

  return (
    <section
      ref={root}
      className="home-why-stylo"
      aria-labelledby="why-stylo-title"
    >
      <div className="reference-container">
        <h2 id="why-stylo-title">
          Por qué <span className="reference-text-gold">STYLO</span>
        </h2>
        <dl className="home-stylo-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>
                <span className="sr-only">{format.format(stat.value)}</span>
                <span aria-hidden="true" data-stat-number>
                  {format.format(stat.value)}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
