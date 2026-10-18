"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Icon } from "@/components/ui/icon";
import { flavorLabel, variantLabel, type Variant } from "@/modules/catalog/model";
import { createGalleryPhotoCache } from "./gallery-photo-cache";
import type { GalleryImage } from "./product-gallery";
import {
  elementPoint,
  flavorDuration,
  flavorMotion as m,
  type FlavorChange,
  type FlavorPoint,
} from "./flavor-motion";

export function FlavorHeroGallery({
  variants,
  images,
  activeId,
  change,
  onRequest,
  onPrepareImage,
  preload,
}: {
  variants: Variant[];
  images: GalleryImage[];
  activeId: string;
  change: FlavorChange | null;
  onRequest: (id: string, direction: number, point: FlavorPoint) => void;
  onPrepareImage: (image: GalleryImage) => void;
  preload?: RefObject<((id: string) => void) | null>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLDivElement>(null);
  const to = useRef<HTMLDivElement>(null);
  const cache = useRef<ReturnType<typeof createGalleryPhotoCache> | null>(null);
  const swipe = useRef<FlavorPoint | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [settled, setSettled] = useState<number | null>(null);
  const [error, setError] = useState("");
  const photo = useCallback(
    (id: string) => images.find((item) => item.variantId === id),
    [images],
  );
  const active = variants.find((item) => item.id === activeId) ?? variants[0];
  const latest = useRef({ activeId, variants, photo, onPrepareImage });
  latest.current = { activeId, variants, photo, onPrepareImage };

  const warm = useCallback(() => {
    const {
      activeId: id,
      variants: list,
      photo: find,
      onPrepareImage: prepare,
    } = latest.current;
    const index = list.findIndex((item) => item.id === id);
    for (const offset of [0, -1, 1]) {
      const item = list[(index + offset + list.length) % list.length];
      const image = find(item.id);
      if (image?.src)
        void cache.current?.load(image.src, "low", image).catch(() => {});
      prepare(image ?? { id: item.id, variantId: item.id, src: "", alt: "" });
    }
  }, []);
  useEffect(() => {
    setEnhanced(true);
    cache.current = createGalleryPhotoCache();
    if (preload)
      preload.current = (id) => {
        const image = latest.current.photo(id);
        if (image?.src)
          void cache.current?.load(image.src, "low", image).catch(() => {});
        latest.current.onPrepareImage(
          image ?? { id, variantId: id, src: "", alt: "" },
        );
      };
    const hero = root.current?.closest(".product-detail");
    hero?.addEventListener("pointerenter", warm);
    const idle = setTimeout(warm, m.idlePreload);
    return () => {
      hero?.removeEventListener("pointerenter", warm);
      if (preload) preload.current = null;
      clearTimeout(idle);
      cache.current?.dispose();
    };
  }, [warm, preload]);
  useEffect(() => {
    const idle = setTimeout(warm, m.idlePreload);
    return () => clearTimeout(idle);
  }, [activeId, warm]);

  useLayoutEffect(() => {
    if (!change) return;
    const outgoing = from.current,
      incoming = to.current;
    if (!outgoing || !incoming) return;
    let cancelled = false;
    const animations: Animation[] = [];
    setError("");
    const run = async () => {
      const image = incoming.querySelector("img");
      try {
        if (image) await image.decode();
        if (cancelled) return;
        incoming.removeAttribute("data-failed");
        const full = change.mode === "full";
        const sign = change.direction;
        outgoing.style.willChange = incoming.style.willChange = full
          ? "transform, opacity"
          : "opacity";
        const duration = flavorDuration(change);
        // Keep the old pack legible until the new one starts arriving. Their
        // short opacity handoff happens while they move in opposite directions.
        const exit = outgoing.animate(
          full
            ? [
                { transform: "translateX(0px) rotateY(0deg)", opacity: 1 },
                {
                  transform: `translateX(${-m.packDistance * sign * 0.5}px) rotateY(${-m.packAngle * sign * 0.5}deg)`,
                  opacity: 1,
                  offset: m.packExitHold / m.exit,
                },
                {
                  transform: `translateX(${-m.packDistance * sign * 0.85}px) rotateY(${-m.packAngle * sign * 0.85}deg)`,
                  opacity: 0.75,
                  offset: m.packExitFade / m.exit,
                },
                {
                  transform: `translateX(${-m.packDistance * sign}px) rotateY(${-m.packAngle * sign}deg)`,
                  opacity: 0,
                },
              ]
            : [{ opacity: 1 }, { opacity: 0 }],
          {
            duration: full ? m.exit : duration / 2,
            easing: full ? m.easing.exit : m.easing.fade,
            fill: "both",
          },
        );
        const enter = incoming.animate(
          full
            ? [
                {
                  transform: `translateX(${m.packDistance * sign}px) rotateY(${m.packAngle * sign}deg)`,
                  opacity: 0,
                  easing: m.easing.enter,
                },
                {
                  transform: `translateX(${m.packDistance * sign * 0.85}px) rotateY(${m.packAngle * sign * 0.85}deg)`,
                  opacity: 0,
                  offset: (m.packVisibleAt - m.enterDelay) / m.enter,
                },
                {
                  transform: `translateX(${(m.packDistance * sign) / 2}px) rotateY(${(m.packAngle * sign) / 2}deg)`,
                  opacity: 0.65,
                  offset: (m.packStrongAt - m.enterDelay) / m.enter,
                },
                {
                  transform: `translateX(${m.packDistance * sign * 0.25}px) rotateY(${m.packAngle * sign * 0.25}deg)`,
                  opacity: 1,
                  offset: (m.packOpaqueAt - m.enterDelay) / m.enter,
                },
                { transform: "translateX(0px) rotateY(0deg)", opacity: 1 },
              ]
            : [{ opacity: 0 }, { opacity: 1 }],
          {
            delay: full ? m.enterDelay : duration / 2,
            duration: full ? m.enter : duration / 2,
            easing: m.easing.fade,
            fill: "both",
          },
        );
        animations.push(exit, enter);
        await enter.finished;
        if (!cancelled) setSettled(change.token);
      } catch {
        if (!cancelled) {
          incoming.dataset.failed = "true";
          setSettled(change.token);
          setError("No pudimos cargar esta imagen. Podés elegir otro sabor.");
        }
      } finally {
        outgoing.style.willChange = incoming.style.willChange = "";
      }
    };
    void run();
    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.cancel());
      outgoing.style.willChange = incoming.style.willChange = "";
    };
  }, [change]);

  const step = (direction: number, point: FlavorPoint) => {
    const index = variants.findIndex(
      (item) => item.id === latest.current.activeId,
    );
    const target =
      variants[(index + direction + variants.length) % variants.length].id;
    latest.current.activeId = target;
    onRequest(target, direction, point);
  };
  const transitioning = Boolean(change && settled !== change.token);
  const layers =
    transitioning && change ? [change.fromId, activeId] : [activeId];
  return (
    <div
      ref={root}
      className="product-image-gallery product-image-gallery-detail variant-spinner flavor-hero-gallery"
      data-transition="choreography"
      data-active-variant={activeId}
      data-spinner-phase={transitioning ? "incoming" : "idle"}
      data-normalized={photo(activeId)?.normalized || undefined}
      onPointerEnter={warm}
      onFocusCapture={warm}
      onKeyDown={(event) => {
        if (
          variants.length < 2 ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)
        )
          return;
        event.preventDefault();
        const bounds = root.current!.getBoundingClientRect();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        step(direction, {
          x: direction > 0 ? bounds.right : bounds.left,
          y: bounds.top + bounds.height / 2,
        });
      }}
    >
      <div
        className="product-image-stage"
        onPointerDown={(event) => {
          if (
            event.pointerType !== "mouse" &&
            event.isPrimary &&
            !(event.target as Element).closest("button")
          )
            swipe.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start || variants.length < 2) return;
          const x = event.clientX - start.x,
            y = event.clientY - start.y;
          if (Math.abs(x) < 40 || Math.abs(x) < Math.abs(y) * 1.4) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const direction = x < 0 ? 1 : -1;
          step(direction, {
            x: direction > 0 ? bounds.right : bounds.left,
            y: event.clientY,
          });
        }}
      >
        <div className="product-frame-link">
          <div className="variant-spinner-frames">
            {layers.map((id, index) => {
              const image = photo(id),
                current = index === layers.length - 1;
              return (
                <div
                  key={id}
                  ref={current ? to : from}
                  className="variant-spinner-frame flavor-hero-pack"
                  aria-hidden={current ? undefined : true}
                  style={{ opacity: current && transitioning ? 0 : 1 }}
                >
                  {image?.src ? (
                    <img
                      className={`product-frame${current ? " product-frame-current" : ""}`}
                      src={image.src}
                      srcSet={image.srcSet}
                      sizes={image.sizes}
                      alt={current ? image.alt : ""}
                      width={1000}
                      height={1000}
                      crossOrigin="anonymous"
                      decoding="async"
                      fetchPriority={current ? "high" : "auto"}
                      draggable={false}
                      onLoad={(event) =>
                        cache.current?.remember(image.src, event.currentTarget)
                      }
                    />
                  ) : (
                    <span
                      className={`product-frame product-no-photo${current ? " product-frame-current" : ""}`}
                      role="img"
                      aria-label={variantLabel(active)}
                    >
                      Imagen del producto pendiente
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {enhanced && variants.length > 1 && (
          <div
            className="variant-navigation"
            role="group"
            aria-label="Elegir sabor"
          >
            {[-1, 1].map((direction) => (
              <button
                key={direction}
                type="button"
                aria-label={
                  direction < 0 ? "Sabor anterior" : "Sabor siguiente"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  step(
                    direction,
                    event.detail
                      ? { x: event.clientX, y: event.clientY }
                      : elementPoint(event.currentTarget),
                  );
                }}
              >
                <Icon
                  name="arrow"
                  className={direction < 0 ? "gallery-back" : undefined}
                />
                <span
                  className="flavor-motion-accent flavor-arrow-accent"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}
        {variants.length > 1 && (
          <span className="variant-spinner-count" aria-hidden="true">
            {variants.findIndex((item) => item.id === activeId) + 1}/
            {variants.length}
          </span>
        )}
        <p
          className={`variant-spinner-status${error ? " gallery-message" : ""}`}
          role="status"
        >
          {error}
        </p>
      </div>
      <p className="variant-spinner-caption" aria-live="polite">
        {flavorLabel(active.flavor) || variantLabel(active)}
      </p>
    </div>
  );
}
