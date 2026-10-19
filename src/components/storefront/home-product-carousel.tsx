"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { RevealGroup } from "@/components/ui/Reveal";

type Position = { first: number; canPrevious: boolean; canNext: boolean };

export function HomeProductCarousel({
  children,
  count,
}: {
  children: ReactNode;
  count: number;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<Position>({
    first: 0,
    canPrevious: false,
    canNext: false,
  });

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const update = () => {
      const track = node.firstElementChild as HTMLElement | null;
      const first = track?.firstElementChild as HTMLElement | null;
      const second = first?.nextElementSibling as HTMLElement | null;
      const step = second
        ? second.offsetLeft - first!.offsetLeft
        : first?.offsetWidth || 1;
      const next = {
        first: Math.min(count - 1, Math.round(node.scrollLeft / step)),
        canPrevious: node.scrollLeft > 2,
        canNext: node.scrollLeft < node.scrollWidth - node.clientWidth - 2,
      };
      setPosition((previous) =>
        previous.first === next.first &&
        previous.canPrevious === next.canPrevious &&
        previous.canNext === next.canNext
          ? previous
          : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    node.addEventListener("scroll", schedule, { passive: true });
    schedule();
    setReady(true);
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame.current);
    };
  }, [count]);

  const move = (direction: -1 | 1) => {
    const node = viewport.current;
    const track = node?.firstElementChild as HTMLElement | null;
    if (!node || !track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const first = cards.findIndex(
      (card) => card.offsetLeft + card.offsetWidth / 2 > node.scrollLeft,
    );
    const target =
      cards[Math.max(0, Math.min(cards.length - 1, first + direction))];
    if (!target) return;
    node.scrollTo({
      left: target.offsetLeft,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <div
      className="home-carousel"
      data-ready={ready}
      data-scrollable={position.canPrevious || position.canNext}
    >
      <div
        id="featured-carousel"
        className="home-carousel-viewport"
        role="region"
        aria-label="Productos destacados"
        tabIndex={0}
        ref={viewport}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        <RevealGroup className="home-product-track" delay={0.16}>
          {children}
        </RevealGroup>
      </div>
      {count > 1 && (
        <div
          className="home-carousel-controls"
          aria-label="Recorrer destacados"
        >
          <span className="home-carousel-position" aria-live="polite">
            {position.first + 1} / {count}
          </span>
          <button
            type="button"
            aria-label="Producto destacado anterior"
            aria-controls="featured-carousel"
            disabled={!position.canPrevious}
            onClick={() => move(-1)}
          >
            <Icon name="arrow" />
          </button>
          <button
            type="button"
            aria-label="Producto destacado siguiente"
            aria-controls="featured-carousel"
            disabled={!position.canNext}
            onClick={() => move(1)}
          >
            <Icon name="arrow" />
          </button>
        </div>
      )}
    </div>
  );
}
