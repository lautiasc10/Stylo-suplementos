"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useMotionPreference } from "@/components/ui/use-motion-preference";
import { variantLabel, type Variant } from "@/modules/catalog/model";
import { createGalleryPhotoCache } from "./gallery-photo-cache";
import { ProductThumbnailRail } from "./product-thumbnail-rail";
import type { GalleryImage } from "./product-gallery";

export type SpinnerVariant = Variant & { images: GalleryImage[] };
type Choice = { index: number; photo: GalleryImage };
type Request = Choice & {
  direction: number;
  user: boolean;
  kind: "variant" | "photo";
};
type Transition = { from: Choice; to: Request; token: number };
type Phase = "idle" | "loading" | "outgoing" | "incoming";

export type VariantSpinnerProps = {
  showThumbnails?: boolean;
  variants: SpinnerVariant[];
  activeId?: string;
  mode?: "card" | "detail";
  href?: string;
  linkLabel?: string;
  eager?: boolean;
  delay?: number;
  startDelay?: number;
  onChange?: (image: GalleryImage) => void;
  selectionRequest?: { variantId: string; nonce: number } | null;
  informationImages?: GalleryImage[];
  onPrepareImage?: (image: GalleryImage) => void;
  prepareImage?: (image: GalleryImage) => Promise<unknown>;
};

function primary(variant: SpinnerVariant): GalleryImage {
  return (
    variant.images[0] ?? {
      id: variant.id,
      variantId: variant.id,
      src: "",
      alt: variantLabel(variant),
    }
  );
}

/** Two decoded pack layers, one bounded queue. The rock/shadow never enter
 * these layers. Only transform and opacity animate; no per-frame React state. */
export function VariantSpinner(props: VariantSpinnerProps) {
  const {
    variants,
    mode = "card",
    eager = false,
    informationImages = [],
    showThumbnails = true,
  } = props;
  const latest = useRef(props);
  latest.current = props;
  const root = useRef<HTMLDivElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  const incoming = useRef<HTMLDivElement>(null);
  const cache = useRef<ReturnType<typeof createGalleryPhotoCache> | null>(null);
  const initial = Math.max(
    0,
    variants.findIndex((item) => item.id === props.activeId),
  );
  const [current, setCurrent] = useState<Choice>(() => ({
    index: initial,
    photo: primary(variants[initial]),
  }));
  const currentRef = useRef(current);
  const desired = useRef(initial);
  const queued = useRef<Request | null>(null);
  const token = useRef(0);
  const mounted = useRef(false);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const [enhanced, setEnhanced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const [manual, setManual] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [message, setMessage] = useState("");
  const [readyPhoto, setReadyPhoto] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const reduced = useMotionPreference();
  const reducedRef = useRef(reduced !== false);
  reducedRef.current = reduced !== false;
  const visibleRef = useRef(false);
  visibleRef.current = visible;
  const finish = useRef<(() => void) | null>(null);
  const pump = useRef<(request: Request) => void>(() => {});
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(0);
  const selectionSeen = useRef<typeof props.selectionRequest>(null);
  const externalId = useRef(props.activeId);
  const firstAuto = useRef(true);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const execute = useCallback(
    async (request: Request) => {
      const sequence = ++token.current;
      changePhase("loading");
      setMessage("");
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const preparation = latest.current.prepareImage?.(request.photo);
        if (preparation) void preparation.catch(() => {});
        if (request.photo.src)
          await Promise.race([
            cache.current?.load(request.photo.src, "high", request.photo),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error("Image timeout")),
                10000,
              );
            }),
          ]);
        if (!mounted.current || sequence !== token.current) return;
        setTransition({
          from: currentRef.current,
          to: request,
          token: sequence,
        });
      } catch {
        if (!mounted.current || sequence !== token.current) return;
        desired.current = currentRef.current.index;
        queued.current = null;
        changePhase("idle");
        setManual(true);
        setMessage("No pudimos cargar esta imagen. Podés intentar otra vez.");
      } finally {
        clearTimeout(timeout);
      }
    },
    [changePhase],
  );
  pump.current = (request) => {
    void execute(request);
  };

  const requestChoice = useCallback(
    (index: number, direction: number, user = true, photo?: GalleryImage) => {
      const variant = latest.current.variants[index];
      if (!variant) return;
      if (user) setManual(true);
      const request: Request = {
        index,
        photo: photo ?? primary(variant),
        direction,
        user,
        kind: photo ? "photo" : "variant",
      };
      desired.current = index;
      if (phaseRef.current === "outgoing" || phaseRef.current === "incoming") {
        queued.current = request;
        return;
      }
      // Replace a pending download immediately, but never interrupt a visible spin.
      if (phaseRef.current === "loading") {
        token.current++;
        cache.current?.cancelPending();
        setTransition(null);
      }
      if (request.photo.id === currentRef.current.photo.id) {
        changePhase("idle");
        setManual(true);
        return;
      }
      pump.current(request);
    },
    [changePhase],
  );
  const step = (direction: number) => {
    const count = latest.current.variants.length;
    requestChoice((desired.current + direction + count) % count, direction);
  };

  const dispose = useCallback(() => {
    token.current++;
    cache.current?.dispose();
    cache.current = null;
  }, []);
  useEffect(() => {
    mounted.current = true;
    setEnhanced(true);
    setSaveData(
      Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData,
      ),
    );
    cache.current = createGalleryPhotoCache();
    const observer = window.IntersectionObserver
      ? new IntersectionObserver(
          ([entry]) => setVisible(entry.isIntersecting),
          { threshold: 0.15 },
        )
      : null;
    if (root.current) observer?.observe(root.current);
    if (!observer) setVisible(true);
    const frame = root.current?.querySelector<HTMLImageElement>(
      ".product-frame-current",
    );
    if (frame?.complete && frame.naturalWidth)
      void frame
        .decode()
        .then(() => {
          if (mounted.current) {
            cache.current?.remember(currentRef.current.photo.src, frame);
            setReadyPhoto(currentRef.current.photo.src);
          }
        })
        .catch(() => {});
    const visibility = () => {
      setDocumentVisible(!document.hidden);
      if (document.hidden) finish.current?.();
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted.current = false;
      dispose();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [dispose]);

  useEffect(() => {
    if (!transition) return;
    let done = false,
      committed = false;
    const animations: Animation[] = [];
    const valid = () =>
      mounted.current && token.current === transition.token && !done;
    const commit = () => {
      if (committed) return;
      committed = true;
      const choice = { index: transition.to.index, photo: transition.to.photo };
      currentRef.current = choice;
      setCurrent(choice);
      setReadyPhoto(choice.photo.src);
      latest.current.onChange?.(transition.to.photo);
      if (transition.to.user)
        setAnnouncement(variantLabel(latest.current.variants[choice.index]));
    };
    const settle = () => {
      if (!valid()) return;
      commit();
      done = true;
      for (const animation of animations) animation.cancel();
      finish.current = null;
      setTransition(null);
      changePhase("idle");
      const next = queued.current;
      queued.current = null;
      if (next && next.photo.id !== currentRef.current.photo.id)
        pump.current(next);
    };
    const animate = async () => {
      const from = outgoing.current,
        to = incoming.current;
      if (!from || !to) return;
      try {
        const image = to.querySelector("img");
        if (image) await image.decode();
        if (!valid()) return;
        finish.current = settle;
        const spin =
          transition.to.kind === "variant" &&
          !transition.from.photo.information &&
          !reducedRef.current;
        const sign = transition.to.direction || 1;
        if (document.hidden || !visibleRef.current || !to.animate) {
          settle();
          return;
        }
        changePhase("outgoing");
        if (spin) {
          if (latest.current.mode === "detail") {
            // Start both halves on the same clock. A warm choice commits its
            // flavor, price and stock immediately, rather than after the exit.
            // Decode above still protects cold/broken photographs from flashes.
            commit();
            changePhase("incoming");
            const exit = from.animate(
              [
                { transform: "rotateY(0deg) scale(1)", opacity: 1 },
                {
                  transform: `rotateY(${-90 * sign}deg) scale(.96)`,
                  opacity: 0,
                },
              ],
              {
                duration: 140,
                easing: "cubic-bezier(.42,0,1,1)",
                fill: "both",
              },
            );
            const enter = to.animate(
              [
                {
                  transform: `rotateY(${90 * sign}deg) scale(.96)`,
                  opacity: 0,
                },
                { transform: "rotateY(0deg) scale(1)", opacity: 1 },
              ],
              {
                duration: 260,
                delay: 100,
                easing: "cubic-bezier(.16,1,.3,1)",
                fill: "both",
              },
            );
            animations.push(exit, enter);
            await Promise.all(
              animations.map((animation) => animation.finished.catch(() => {})),
            );
            settle();
            return;
          }
          const exit = from.animate(
            [
              { transform: "rotateY(0deg) scale(1)", opacity: 1 },
              { transform: `rotateY(${-90 * sign}deg) scale(.92)`, opacity: 0 },
            ],
            { duration: 200, easing: "cubic-bezier(.42,0,1,1)", fill: "both" },
          );
          animations.push(exit);
          await exit.finished.catch(() => {});
          if (!valid()) return;
          commit();
          changePhase("incoming");
          const enter = to.animate(
            [
              { transform: `rotateY(${90 * sign}deg) scale(.92)`, opacity: 0 },
              { transform: "rotateY(0deg) scale(1)", opacity: 1 },
            ],
            { duration: 280, easing: "cubic-bezier(0,0,.58,1)", fill: "both" },
          );
          animations.push(enter);
          await enter.finished.catch(() => {});
        } else {
          // The outgoing layer remains opaque beneath the incoming crossfade.
          commit();
          changePhase("incoming");
          const fade = to.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: reducedRef.current ? 180 : 250,
            easing: "ease-out",
            fill: "both",
          });
          animations.push(fade);
          await fade.finished.catch(() => {});
        }
        settle();
      } catch {
        if (!valid()) return;
        done = true;
        desired.current = currentRef.current.index;
        queued.current = null;
        finish.current = null;
        setTransition(null);
        changePhase("idle");
        setManual(true);
        setMessage("No pudimos cargar esta imagen. Podés intentar otra vez.");
      }
    };
    void animate();
    return () => {
      done = true;
      for (const animation of animations) animation.cancel();
    };
  }, [transition, changePhase]);

  useEffect(() => {
    if (reduced) finish.current?.();
  }, [reduced]);
  useEffect(() => {
    const selection = props.selectionRequest;
    if (!selection || selectionSeen.current === selection) return;
    selectionSeen.current = selection;
    const index = latest.current.variants.findIndex(
      (item) => item.id === selection.variantId,
    );
    if (index >= 0) requestChoice(index, index >= desired.current ? 1 : -1);
  }, [props.selectionRequest, requestChoice]);
  useEffect(() => {
    if (props.activeId === externalId.current) return;
    externalId.current = props.activeId;
    const index = latest.current.variants.findIndex(
      (item) => item.id === props.activeId,
    );
    if (index >= 0 && index !== currentRef.current.index)
      requestChoice(index, index >= desired.current ? 1 : -1);
  }, [props.activeId, requestChoice]);

  const automatic =
    mode === "card" &&
    new Set(variants.map((item) => primary(item).src).filter(Boolean)).size > 1;
  const playing =
    enhanced &&
    automatic &&
    reduced === false &&
    visible &&
    documentVisible &&
    !focused &&
    !manual &&
    !saveData &&
    (!current.photo.src || readyPhoto === current.photo.src) &&
    phase === "idle";
  useEffect(() => {
    // Offscreen cards retain no decoded neighbor objects. Explicit selection
    // from chips below a photograph is allowed to finish before releasing them.
    if (
      enhanced &&
      (!visible || !documentVisible) &&
      phase === "idle" &&
      phaseRef.current === "idle"
    )
      cache.current?.release();
  }, [enhanced, visible, documentVisible, phase]);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () => {
        firstAuto.current = false;
        requestChoice(
          (currentRef.current.index + 1) % latest.current.variants.length,
          1,
          false,
        );
      },
      (props.delay ?? 3000) + (firstAuto.current ? (props.startDelay ?? 0) : 0),
    );
    return () => clearTimeout(timer);
  }, [playing, current.index, props.delay, props.startDelay, requestChoice]);
  useEffect(() => {
    if (
      !enhanced ||
      !visible ||
      !documentVisible ||
      phase !== "idle" ||
      (current.photo.src && readyPhoto !== current.photo.src)
    )
      return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    const timer = setTimeout(() => {
      if (phaseRef.current !== "idle") return;
      for (const direction of [-1, 1]) {
        const next = primary(
          latest.current.variants[
            (current.index + direction + variants.length) % variants.length
          ],
        );
        if (next.src)
          void cache.current?.load(next.src, "low", next).catch(() => {});
        latest.current.onPrepareImage?.(next);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [
    enhanced,
    visible,
    documentVisible,
    phase,
    current.index,
    variants.length,
    current.photo.src,
    readyPhoto,
  ]);

  const variant = variants[current.index] ?? variants[0];
  const main = primary(variant);
  const thumbnails = [
    ...variant.images,
    ...(main.turnImages ?? []),
    ...informationImages,
  ];
  const rail = mode === "detail" && showThumbnails && thumbnails.length > 1;
  const photos = transition
    ? [transition.from.photo, transition.to.photo]
    : [current.photo];
  const inspected = current.photo.id !== main.id;
  const frames = (
    <div className="variant-spinner-frames">
      {photos.map((photo) => {
        const target = transition?.to.photo.id === photo.id;
        const active = current.photo.id === photo.id;
        return (
          <div
            key={photo.id}
            ref={(node) => {
              if (target) incoming.current = node;
              else outgoing.current = node;
            }}
            className={`variant-spinner-frame${active && inspected ? " product-inspected-image" : ""}`}
            data-information={photo.information || undefined}
            aria-hidden={active ? undefined : true}
            style={{ opacity: target && phase !== "incoming" ? 0 : 1 }}
          >
            {photo.src ? (
              <img
                className={`product-frame${active ? " product-frame-current" : ""}`}
                src={photo.src}
                srcSet={photo.srcSet}
                sizes={photo.sizes}
                alt={active ? photo.alt : ""}
                width={1000}
                height={1000}
                crossOrigin="anonymous"
                decoding="async"
                draggable={false}
                loading={
                  mode === "detail" || eager || transition ? "eager" : "lazy"
                }
                fetchPriority={eager ? "high" : "auto"}
                onLoad={(event) => {
                  cache.current?.remember(photo.src, event.currentTarget);
                  if (active) setReadyPhoto(photo.src);
                }}
                onError={() => {
                  if (!transition)
                    setMessage(
                      "No pudimos cargar esta imagen. Podés intentar otra vez.",
                    );
                }}
              />
            ) : (
              <span
                className={`product-frame product-no-photo${active ? " product-frame-current" : ""}`}
                role="img"
                aria-label={photo.alt}
              >
                Imagen del producto pendiente
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
  return (
    <div
      ref={root}
      className={`product-image-gallery product-image-gallery-${mode} variant-spinner${rail ? " product-gallery-with-rail" : ""}`}
      data-normalized={current.photo.normalized || undefined}
      data-enhanced={enhanced || undefined}
      data-transition="turn"
      data-spinner-phase={phase}
      data-animated={transition ? "true" : undefined}
      data-auto-playing={playing || undefined}
      data-inspecting={inspected || undefined}
      data-active-variant={variant.id}
      aria-busy={phase === "loading"}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        step(event.key === "ArrowLeft" ? -1 : 1);
      }}
      onClickCapture={(event) => {
        if (
          (event.target as Element).closest("a.product-frame-link") &&
          performance.now() < suppressClick.current
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div
        className="product-image-stage"
        onPointerDown={(event) => {
          if (
            event.pointerType === "mouse" ||
            !event.isPrimary ||
            (event.target as Element).closest("button")
          )
            return;
          swipe.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const x = event.clientX - start.x,
            y = event.clientY - start.y;
          if (Math.abs(x) < 40 || Math.abs(x) < Math.abs(y) * 1.4) return;
          event.preventDefault();
          suppressClick.current = performance.now() + 500;
          step(x < 0 ? 1 : -1);
        }}
      >
        {props.href ? (
          <Link
            className="product-frame-link"
            href={main.href ?? props.href}
            aria-label={props.linkLabel}
          >
            {frames}
          </Link>
        ) : (
          <div className="product-frame-link">{frames}</div>
        )}
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
                  step(direction);
                }}
              >
                <Icon
                  name="arrow"
                  className={direction < 0 ? "gallery-back" : undefined}
                />
              </button>
            ))}
          </div>
        )}
        <span className="variant-spinner-count" aria-hidden="true">
          {current.index + 1}/{variants.length}
        </span>
        <p
          className={`variant-spinner-status${message ? " gallery-message" : ""}`}
          role="status"
        >
          {message || (phase === "loading" ? "Cargando sabor…" : "")}
        </p>
      </div>
      {mode === "detail" && (
        <>
          <p className="variant-spinner-caption">
            {variant.flavor || variantLabel(variant)}
          </p>
          {showThumbnails && (
            <ProductThumbnailRail
              images={thumbnails}
              selectedId={current.photo.id}
              onSelect={(photo) =>
                requestChoice(currentRef.current.index, 1, true, photo)
              }
            />
          )}
        </>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      <noscript>
        <div className="product-static-images">
          {variants.map((item) => (
            <a
              key={item.id}
              href={primary(item).href ?? `?variante=${item.id}`}
            >
              Ver {variantLabel(item)}
            </a>
          ))}
        </div>
      </noscript>
    </div>
  );
}
