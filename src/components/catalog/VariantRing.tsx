"use client";

import Link from "next/link";
import { animate, type AnimationPlaybackControlsWithThen } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useMotionPreference } from "@/components/ui/use-motion-preference";
import { variantLabel, type Variant } from "@/modules/catalog/model";
import { createGalleryPhotoCache } from "./gallery-photo-cache";
import { ProductThumbnailRail } from "./product-thumbnail-rail";
import { useTilt } from "./useTilt";
import {
  ringPose,
  ringSlot,
  ringDirection,
  type RingSize,
} from "./variant-ring-poses";
import { ProductPhoto, photoDelivery } from "./product-photo";
import type { GalleryImage } from "./product-gallery";

export type RingVariant = Variant & { images: GalleryImage[] };
type Choice = { index: number; photo: GalleryImage };
type Request = Choice & {
  direction: number;
  user: boolean;
  kind: "variant" | "photo";
};
type Transition = {
  from: Choice;
  to: Request;
  token: number;
  side: number;
  crossfade: boolean;
};
type Phase = "idle" | "loading" | "rotating" | "fading";
export type VariantRingProps = {
  variants: RingVariant[];
  size: RingSize;
  activeId?: string;
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
function primary(variant: RingVariant): GalleryImage {
  return (
    variant.images[0] ?? {
      id: variant.id,
      variantId: variant.id,
      src: "",
      alt: variantLabel(variant),
    }
  );
}

/** One bounded ring for every product. Neighbor layers only use front covers;
 * thumbnails remain available but never become rotation frames. */
export function VariantRing(props: VariantRingProps) {
  const { variants, size, eager = false, informationImages = [] } = props;
  const compact = size === "compact",
    count = variants.length;
  const latest = useRef(props);
  latest.current = props;
  const root = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLDivElement>(null);
  const cache = useRef<ReturnType<typeof createGalleryPhotoCache> | null>(null);
  const [current, setCurrent] = useState<Choice>(() => {
    const index = Math.max(
      0,
      variants.findIndex((v) => v.id === props.activeId),
    );
    return { index, photo: primary(variants[index]) };
  });
  const currentRef = useRef(current),
    desired = useRef(current.index),
    queued = useRef<Request | null>(null);
  const token = useRef(0),
    mounted = useRef(false),
    phaseRef = useRef<Phase>("idle");
  const [phase, setPhase] = useState<Phase>("idle"),
    [transition, setTransition] = useState<Transition | null>(null);
  const [enhanced, setEnhanced] = useState(false),
    [visible, setVisible] = useState(false),
    [documentVisible, setDocumentVisible] = useState(true);
  const [engaged, setEngaged] = useState(false),
    [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false),
    [manual, setManual] = useState(false);
  const [saveData, setSaveData] = useState(false),
    [readyPhoto, setReadyPhoto] = useState("");
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState(""),
    [announcement, setAnnouncement] = useState("");
  const reduced = useMotionPreference(),
    reducedRef = useRef(true);
  reducedRef.current = reduced !== false;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const neighborSide = useRef(1),
    finish = useRef<(() => void) | null>(null),
    pump = useRef<(request: Request) => void>(() => {});
  const swipe = useRef<{ x: number; y: number } | null>(null),
    suppressClick = useRef(0);
  const selectionSeen = useRef<typeof props.selectionRequest>(null),
    externalId = useRef(props.activeId),
    firstAuto = useRef(true);
  const tilt = useTilt(
    stage,
    enhanced &&
      visible &&
      documentVisible &&
      reduced === false &&
      phase === "idle" &&
      (!compact || hovered) &&
      !current.photo.information,
    compact ? 5 : 8,
  );

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const rememberReady = useCallback(
    (id: string) =>
      setReady((old) => (old.has(id) ? old : new Set([...old, id]))),
    [],
  );
  const execute = useCallback(
    async (request: Request) => {
      const sequence = ++token.current;
      changePhase("loading");
      setMessage("");
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const decoration = latest.current.prepareImage?.(request.photo);
        if (decoration) void decoration.catch(() => {});
        if (request.photo.src)
          await Promise.race([
            cache.current?.load(
              request.photo.src,
              "high",
              photoDelivery(request.photo, size),
            ),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error("Image timeout")),
                10000,
              );
            }),
          ]);
        if (!mounted.current || token.current !== sequence) return;
        rememberReady(request.photo.id);
        setTransition({
          from: currentRef.current,
          to: {
            ...request,
            direction: ringDirection(
              currentRef.current.index,
              request.index,
              latest.current.variants.length,
              request.direction,
            ),
          },
          token: sequence,
          side: neighborSide.current,
          crossfade:
            reducedRef.current ||
            request.kind === "photo" ||
            !!currentRef.current.photo.information,
        });
      } catch {
        if (!mounted.current || token.current !== sequence) return;
        desired.current = currentRef.current.index;
        queued.current = null;
        changePhase("idle");
        setManual(true);
        setMessage("No pudimos cargar esta imagen. Podés intentar otra vez.");
      } finally {
        clearTimeout(timeout);
      }
    },
    [changePhase, rememberReady, size],
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
      if (phaseRef.current === "rotating" || phaseRef.current === "fading") {
        queued.current = request;
        return;
      }
      if (phaseRef.current === "loading") {
        token.current++;
        cache.current?.cancelPending();
        setTransition(null);
      }
      if (request.photo.id === currentRef.current.photo.id) {
        changePhase("idle");
        return;
      }
      pump.current(request);
    },
    [changePhase],
  );
  const step = (direction: number) =>
    requestChoice((desired.current + direction + count) % count, direction);

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
    const image = root.current?.querySelector<HTMLImageElement>(
      ".product-frame-current",
    );
    if (image?.complete && image.naturalWidth)
      void image
        .decode()
        .then(() => {
          if (mounted.current) {
            cache.current?.remember(currentRef.current.photo.src, image);
            setReadyPhoto(currentRef.current.photo.src);
            rememberReady(currentRef.current.photo.id);
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
  }, [rememberReady, dispose]);

  useEffect(() => {
    if (!transition) return;
    let done = false;
    const animations: AnimationPlaybackControlsWithThen[] = [];
    const nativeAnimations: Animation[] = [];
    const valid = () =>
      mounted.current && token.current === transition.token && !done;
    const settle = () => {
      if (!valid()) return;
      done = true;
      for (const a of animations) a.stop();
      for (const a of nativeAnimations) a.cancel();
      root.current
        ?.querySelectorAll<HTMLElement>(".variant-ring-item")
        .forEach((item) => item.style.removeProperty("will-change"));
      neighborSide.current =
        count === 2 && !transition.crossfade
          ? -transition.side
          : transition.side;
      const choice = { index: transition.to.index, photo: transition.to.photo };
      currentRef.current = choice;
      setCurrent(choice);
      setReadyPhoto(choice.photo.src);
      latest.current.onChange?.(choice.photo);
      if (transition.to.user && transition.to.kind === "variant")
        setAnnouncement(variantLabel(latest.current.variants[choice.index]));
      finish.current = null;
      setTransition(null);
      changePhase("idle");
      const next = queued.current;
      queued.current = null;
      if (next && next.photo.id !== choice.photo.id) pump.current(next);
    };
    const run = async () => {
      const arriving = root.current?.querySelector<HTMLDivElement>(
        ".variant-ring-item[data-arriving=true]",
      );
      if (!arriving) return;
      try {
        const image = arriving.querySelector("img");
        if (image) {
          await image.decode();
        }
        if (!valid()) return;
        finish.current = settle;
        if (document.hidden || !visibleRef.current || !arriving.animate) {
          settle();
          return;
        }
        const fading = transition.crossfade || reducedRef.current;
        changePhase(fading ? "fading" : "rotating");
        if (fading) {
          animations.push(
            animate(
              arriving,
              { opacity: [0, 1] },
              { duration: reducedRef.current ? 0.18 : 0.25, ease: "easeOut" },
            ),
          );
        } else {
          const items =
            root.current!.querySelectorAll<HTMLDivElement>(
              ".variant-ring-item",
            );
          for (const item of items) {
            if (!item.dataset.loaded) continue;
            const from = Number(item.dataset.from),
              to = Number(item.dataset.to);
            const a = ringPose(from, size),
              c = ringPose(to, size);
            if (a.opacity === 0 && c.opacity === 0) continue;
            const wraps =
              Math.sign(from) !== Math.sign(to) && from !== 0 && to !== 0;
            item.style.willChange = "transform";
            if (wraps) {
              // Native offsets keep the wrap completely invisible while crossing.
              // This also avoids a JS-driven opacity track alongside the compositor.
              nativeAnimations.push(
                item.animate(
                  [0, 0.08, 0.92, 1].map((offset, i) => ({
                    transform: ringPose(from + (to - from) * offset, size)
                      .transform,
                    opacity: [a.opacity, 0, 0, c.opacity][i],
                    offset,
                  })),
                  {
                    duration: 550,
                    easing: "cubic-bezier(.22,.8,.3,1)",
                    fill: "both",
                  },
                ),
              );
              continue;
            }
            animations.push(
              animate(
                item,
                {
                  transform: [a.transform, c.transform],
                  opacity: [a.opacity, c.opacity],
                },
                {
                  duration: 0.55,
                  ease: [0.22, 0.8, 0.3, 1],
                },
              ),
            );
          }
          const shimmer = arriving.querySelector<HTMLElement>(
            ".variant-ring-shimmer",
          );
          if (shimmer)
            animations.push(
              animate(
                shimmer,
                {
                  transform: ["translateX(-100%)", "translateX(100%)"],
                  opacity: [0, 0.18, 0],
                },
                { duration: 0.55, ease: "easeOut" },
              ),
            );
        }
        await Promise.all([
          ...animations,
          ...nativeAnimations.map((a) => a.finished),
        ]);
        settle();
      } catch {
        if (!valid()) return;
        done = true;
        for (const a of animations) a.stop();
        for (const a of nativeAnimations) a.cancel();
        desired.current = currentRef.current.index;
        queued.current = null;
        finish.current = null;
        setTransition(null);
        changePhase("idle");
        setManual(true);
        setMessage("No pudimos cargar esta imagen. Podés intentar otra vez.");
      }
    };
    void run();
    return () => {
      done = true;
      for (const a of animations) a.stop();
      for (const a of nativeAnimations) a.cancel();
    };
  }, [transition, changePhase, count, size]);

  useEffect(() => {
    if (reduced) finish.current?.();
  }, [reduced]);
  useEffect(() => {
    const choice = props.selectionRequest;
    if (!choice || selectionSeen.current === choice) return;
    selectionSeen.current = choice;
    const index = latest.current.variants.findIndex(
      (v) => v.id === choice.variantId,
    );
    if (index >= 0) requestChoice(index, index >= desired.current ? 1 : -1);
  }, [props.selectionRequest, requestChoice]);
  useEffect(() => {
    if (props.activeId === externalId.current) return;
    externalId.current = props.activeId;
    const index = latest.current.variants.findIndex(
      (v) => v.id === props.activeId,
    );
    if (index >= 0 && index !== currentRef.current.index)
      requestChoice(index, index >= desired.current ? 1 : -1);
  }, [props.activeId, requestChoice]);

  useEffect(() => {
    if (
      enhanced &&
      (!visible || !documentVisible) &&
      phase === "idle" &&
      phaseRef.current === "idle"
    ) {
      cache.current?.release();
      setReady((old) => (old.size ? new Set() : old));
    }
  }, [enhanced, visible, documentVisible, phase]);
  useEffect(() => {
    // Compact cards download no neighboring photograph until pointer/focus/touch intent.
    if (
      !enhanced ||
      !visible ||
      !documentVisible ||
      (compact && !engaged) ||
      saveData ||
      phase !== "idle" ||
      (current.photo.src && readyPhoto !== current.photo.src)
    )
      return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        if (phaseRef.current !== "idle") return;
        for (const direction of [-1, 1]) {
          const next = primary(
            latest.current.variants[
              (current.index + direction + count) % count
            ],
          );
          if (next.id === currentRef.current.photo.id) continue;
          if (next.src)
            void cache.current
              ?.load(next.src, "low", photoDelivery(next, size))
              .then(() => {
                if (mounted.current && !cancelled) rememberReady(next.id);
              })
              .catch(() => {});
          latest.current.onPrepareImage?.(next);
        }
      },
      compact ? 60 : 150,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    enhanced,
    visible,
    documentVisible,
    compact,
    engaged,
    saveData,
    phase,
    current.index,
    current.photo.src,
    readyPhoto,
    count,
    rememberReady,
    size,
  ]);
  const playing =
    compact &&
    count > 1 &&
    hovered &&
    enhanced &&
    visible &&
    documentVisible &&
    !focused &&
    !manual &&
    !saveData &&
    reduced === false &&
    phase === "idle" &&
    readyPhoto === current.photo.src;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () => {
        firstAuto.current = false;
        requestChoice((currentRef.current.index + 1) % count, 1, false);
      },
      (props.delay ?? 3000) + (firstAuto.current ? (props.startDelay ?? 0) : 0),
    );
    return () => clearTimeout(timer);
  }, [
    playing,
    current.index,
    count,
    props.delay,
    props.startDelay,
    requestChoice,
  ]);

  const variant = variants[current.index],
    main = primary(variant),
    inspected = current.photo.id !== main.id;
  const thumbnails = [
    ...variant.images,
    ...(main.turnImages ?? []),
    ...informationImages,
  ];
  const rail = !compact && thumbnails.length > 1;
  // Variant nodes are permanent and keyed by variant ID. Sources are enabled only
  // on intent or explicit selection, before animation; hidden variants fetch nothing.
  const fronts = variants.map(primary);
  const extras = compact
    ? []
    : [
        ...variants.flatMap((v) =>
          v.images.slice(1).concat(primary(v).turnImages ?? []),
        ),
        ...informationImages,
      ];
  const allPhotos = fronts.map((photo, index) => ({
    key: variants[index].id,
    photo,
    index,
    front: true,
  }));
  for (const photo of extras)
    if (!allPhotos.some((item) => item.photo.id === photo.id))
      allPhotos.push({
        key: "photo:" + photo.id,
        photo,
        index: variants.findIndex((v) => v.id === photo.variantId),
        front: false,
      });
  const offsetFor = (
    index: number,
    photo: GalleryImage,
    choice: Choice,
    side: number,
  ) => {
    if (photo.id === choice.photo.id) return 0;
    if (
      !fronts.some((p) => p.id === photo.id) ||
      choice.photo.id !== primary(variants[choice.index]).id ||
      reduced !== false ||
      !enhanced
    )
      return 3;
    return ringSlot(index, choice.index, count) * (count === 2 ? side : 1);
  };
  const items = allPhotos.map((item) => {
    const { index, photo } = item;
    if (
      transition?.crossfade &&
      [transition.from.photo.id, transition.to.photo.id].includes(photo.id)
    )
      return { ...item, from: 0, to: 0 };
    return {
      ...item,
      from: offsetFor(
        index,
        photo,
        transition?.from ?? current,
        transition?.side ?? neighborSide.current,
      ),
      to: transition
        ? offsetFor(
            index,
            photo,
            transition.to,
            count === 2 && !transition.crossfade
              ? -transition.side
              : transition.side,
          )
        : offsetFor(index, photo, current, neighborSide.current),
    };
  });

  const frames = (
    <div className="variant-ring-frames">
      {items.map(({ key, photo, from, to }) => {
        const active = photo.id === current.photo.id,
          target = photo.id === transition?.to.photo.id;
        const enabled = photo.id === current.photo.id || ready.has(photo.id);
        const pose = ringPose(from, size);
        return (
          <div
            key={key}
            className={`variant-ring-item${active && inspected ? " product-inspected-image" : ""}`}
            data-current={active || undefined}
            data-arriving={target || undefined}
            data-from={from}
            data-to={to}
            data-information={photo.information || undefined}
            data-framed={photo.framed || photo.information || undefined}
            data-slot={from}
            data-loaded={enabled || undefined}
            data-visible={(enabled && pose.opacity > 0) || undefined}
            aria-hidden={active ? undefined : true}
            style={{
              transform: pose.transform,
              opacity:
                !enabled || (target && transition?.crossfade)
                  ? 0
                  : pose.opacity,
              zIndex: active ? 3 : target ? 2 : 1,
            }}
          >
            <div className="variant-ring-tilt">
              {photo.src ? (
                <ProductPhoto
                  photo={photo}
                  size={size}
                  enabled={enabled}
                  active={active}
                  eager={eager}
                  onLoad={(event) => {
                    cache.current?.remember(photo.src, event.currentTarget);
                    if (currentRef.current.photo.id === photo.id)
                      setReadyPhoto(photo.src);
                  }}
                  onError={() => {
                    if (
                      phaseRef.current === "idle" &&
                      currentRef.current.photo.id === photo.id
                    )
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
              {photo.src && (
                <span className="variant-ring-light" aria-hidden="true">
                  <span className="variant-ring-glow" />
                  <span className="variant-ring-shimmer" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div
      ref={root}
      className={`product-image-gallery product-image-gallery-${compact ? "card" : "detail"} variant-ring variant-ring-${size}${rail ? " product-gallery-with-rail" : ""}`}
      data-normalized={current.photo.normalized || undefined}
      data-enhanced={enhanced || undefined}
      data-engaged={!compact || hovered || focused || undefined}
      data-ring-phase={phase}
      data-transition="ring"
      data-animated={(transition && reduced === false) || undefined}
      data-auto-playing={playing || undefined}
      data-inspecting={inspected || undefined}
      data-active-variant={variant.id}
      aria-busy={phase === "loading"}
      onPointerEnter={(event) => {
        setEngaged(true);
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => {
        setFocused(true);
        setEngaged(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (
          count < 2 ||
          (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
        )
          return;
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
        ref={stage}
        className="product-image-stage"
        onPointerMove={!compact || hovered ? tilt.onPointerMove : undefined}
        onPointerEnter={tilt.onPointerEnter}
        onPointerLeave={tilt.onPointerLeave}
        onPointerDown={(event) => {
          setEngaged(true);
          tilt.onPointerDown(event);
          if (
            event.pointerType !== "mouse" &&
            event.isPrimary &&
            !(event.target as Element).closest("button")
          )
            swipe.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={() => {
          swipe.current = null;
          tilt.onPointerCancel();
        }}
        onPointerUp={(event) => {
          tilt.onPointerUp(event);
          const start = swipe.current;
          swipe.current = null;
          if (!start || count < 2) return;
          const x = event.clientX - start.x,
            y = event.clientY - start.y;
          if (Math.abs(x) < 40 || Math.abs(x) < Math.abs(y) * 1.4) return;
          event.preventDefault();
          suppressClick.current = performance.now() + 500;
          step(x < 0 ? 1 : -1);
        }}
      >
        <span className="variant-ring-shadow" aria-hidden="true" />
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
        {enhanced && count > 1 && (
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
                  setEngaged(true);
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
        {count > 1 && (
          <span className="variant-ring-count" aria-hidden="true">
            {current.index + 1}/{count}
          </span>
        )}
        <p
          className={`variant-ring-status${message ? " gallery-message" : ""}`}
          role="status"
        >
          {message || (phase === "loading" ? "Cargando sabor…" : "")}
        </p>
      </div>
      {!compact && (
        <>
          {count > 1 && (
            <p className="variant-ring-caption">
              {variant.flavor || variantLabel(variant)}
            </p>
          )}
          <ProductThumbnailRail
            images={thumbnails}
            selectedId={current.photo.id}
            onSelect={(photo) =>
              requestChoice(currentRef.current.index, 1, true, photo)
            }
          />
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
