"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import { Icon } from "@/components/ui/icon";
import { positionProductPhoto } from "./product-photo-position";
import { createGalleryPhotoCache } from "./gallery-photo-cache";
import { PackageTurn, type PackageTurnState } from "./package-turn";
import { ProductThumbnailRail } from "./product-thumbnail-rail";
import { VariantSpinner } from "./VariantSpinner";
import { useModalOpen } from "@/components/ui/use-modal-open";
import type { Variant } from "@/modules/catalog/model";

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  variantId?: string;
  href?: string;
  thumbnailSrc?: string;
  information?: boolean;
  normalized?: boolean;
  srcSet?: string;
  sizes?: string;
  turnImages?: (GalleryImage & { view: "left" | "back" | "right" })[];
};

// A deterministic mesh keeps server/client markup identical. Each fragment reuses
// an already loaded photo; the mesh exists only during a card image swap.
const mesh = [
  [
    [0, 0],
    [35, 0],
    [66, 0],
    [100, 0],
  ],
  [
    [0, 24],
    [31, 28],
    [68, 21],
    [100, 26],
  ],
  [
    [0, 50],
    [36, 46],
    [63, 54],
    [100, 47],
  ],
  [
    [0, 75],
    [28, 78],
    [69, 73],
    [100, 77],
  ],
  [
    [0, 100],
    [33, 100],
    [65, 100],
    [100, 100],
  ],
];
const fragments = mesh
  .slice(0, -1)
  .flatMap((row, y) =>
    row.slice(0, -1).flatMap((point, x) => {
      const right = row[x + 1],
        below = mesh[y + 1][x],
        diagonal = mesh[y + 1][x + 1];
      return (x + y) % 2
        ? [
            [point, right, below],
            [right, diagonal, below],
          ]
        : [
            [point, right, diagonal],
            [point, diagonal, below],
          ];
    }),
  )
  .map((triangle, index) => {
    const center = [0, 1].map(
      (axis) => triangle.reduce((sum, point) => sum + point[axis], 0) / 3,
    );
    return {
      clipPath: `polygon(${triangle.map((point) => `${point[0]}% ${point[1]}%`).join(",")})`,
      transformOrigin: `${center[0]}% ${center[1]}%`,
      "--fragment-x": `${(center[0] - 50) * 0.11}%`,
      "--fragment-y": `${(center[1] - 50) * 0.08}%`,
      "--fragment-rotation": `${((index * 5) % 13) - 6}deg`,
      "--fragment-delay": `${(index % 6) * 16}ms`,
    } as CSSProperties;
  });

const fittedFrames = new WeakMap<HTMLImageElement, string>();
function fitFrame(image: HTMLImageElement) {
  // Load events and layout synchronization can visit the same frame twice.
  // Fit once per source to avoid repeating DOM writes and style invalidation.
  if (!image.naturalWidth || fittedFrames.get(image) === image.src) return;
  image.dataset.portrait = String(
    image.naturalHeight / image.naturalWidth > 1.3,
  );
  positionProductPhoto(image);
  fittedFrames.set(image, image.src);
}

function frameLoaded(event: SyntheticEvent<HTMLImageElement>) {
  fitFrame(event.currentTarget);
}

export type ProductGalleryProps = {
  showThumbnails?: boolean;
  variants?: Variant[];
  images: GalleryImage[];
  href?: string;
  linkLabel?: string;
  mode?: "card" | "detail";
  delay?: number;
  startDelay?: number;
  onImageChange?: (image: GalleryImage) => void;
  transition?: "fragments" | "turn" | "fade";
  flavorNavigation?: boolean;
  initialVariantId?: string;
  onPrepareImage?: (image: GalleryImage) => void;
  /** Optional decoration readiness. The caller must bound its wait and handle
   * decorative failures; a failed product photograph still preserves selection. */
  prepareImage?: (image: GalleryImage) => Promise<unknown>;
  selectionRequest?: { variantId: string; nonce: number } | null;
  informationImages?: GalleryImage[];
  eager?: boolean;
};

export function ProductGallery(props: ProductGalleryProps) {
  if (props.variants && props.variants.length > 1)
    return (
      <VariantSpinner
        variants={props.variants.map((variant) => ({
          ...variant,
          images: props.images.filter(
            (image) => image.variantId === variant.id,
          ),
        }))}
        activeId={props.initialVariantId}
        mode={props.mode}
        href={props.href}
        linkLabel={props.linkLabel}
        eager={props.eager}
        delay={props.delay}
        startDelay={props.startDelay}
        onChange={props.onImageChange}
        selectionRequest={props.selectionRequest}
        informationImages={props.informationImages}
        showThumbnails={props.showThumbnails}
        onPrepareImage={props.onPrepareImage}
        prepareImage={props.prepareImage}
      />
    );
  // A normalized single-photo card has no gallery state to hydrate. Keep its
  // native image/link and the outer card's hover/tilt, without mounting timers,
  // observers, caches or a second settling copy of the same photograph.
  if (
    props.mode !== "detail" &&
    props.images.length === 1 &&
    props.images[0].normalized
  )
    return <StaticCardPhoto {...props} />;
  return (
    <LegacyProductGallery
      {...props}
      flavorNavigation={false}
      transition={props.mode === "detail" ? "fade" : props.transition}
    />
  );
}

function StaticCardPhoto({
  images: [image],
  href,
  linkLabel,
  eager = false,
}: ProductGalleryProps) {
  const frame = (
    <span className="product-frame-pair">
      <img
        className="product-frame product-frame-current"
        src={image.src}
        srcSet={image.srcSet}
        sizes={image.sizes}
        alt={image.alt}
        width={720}
        height={720}
        crossOrigin="anonymous"
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
      />
    </span>
  );
  return (
    <div
      className="product-image-gallery product-image-gallery-card"
      data-normalized="true"
    >
      <div className="product-image-stage">
        {href ? (
          <Link
            className="product-frame-link"
            href={image.href ?? href}
            aria-label={linkLabel}
          >
            {frame}
          </Link>
        ) : (
          <div className="product-frame-link">{frame}</div>
        )}
      </div>
    </div>
  );
}

function LegacyProductGallery({
  showThumbnails = true,
  images,
  href,
  linkLabel,
  mode = "card",
  delay = 3000,
  startDelay = 0,
  onImageChange,
  transition = "fragments",
  flavorNavigation = false,
  initialVariantId,
  onPrepareImage,
  prepareImage,
  selectionRequest,
  informationImages = [],
  eager = false,
}: ProductGalleryProps) {
  const root = useRef<HTMLDivElement>(null);
  const framePair = useRef<HTMLSpanElement>(null);
  const request = useRef(0);
  const firstAutomaticChange = useRef(true);
  const photoCache = useRef<ReturnType<typeof createGalleryPhotoCache> | null>(
    null,
  );
  if (!photoCache.current) photoCache.current = createGalleryPhotoCache();
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      images.findIndex((image) => image.variantId === initialVariantId),
    ),
  );
  const [previous, setPrevious] = useState<number | null>(null);
  const [packageTurn, setPackageTurn] = useState<PackageTurnState | null>(null);
  const finishTurn = useRef<(() => void) | null>(null);
  const [inspected, setInspected] = useState<GalleryImage | null>(null);
  const activeIndex = useRef(active);
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const modalOpen = useModalOpen();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [readyImage, setReadyImage] = useState<string | null>(null);
  const pending = useRef<number | null>(null);
  const processedSelection = useRef<typeof selectionRequest>(null);
  const explicitSelectionPending = useRef(false);
  const visibleRef = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const multiple = images.length > 1;
  const turning = transition === "turn";
  const automatic =
    mode === "card" &&
    multiple &&
    images.some((image) => image.src !== images[0].src);
  const playing =
    automatic &&
    !reduced &&
    !paused &&
    !interacting &&
    readyImage === images[active]?.src &&
    visible &&
    documentVisible &&
    !modalOpen;

  useLayoutEffect(() => {
    root.current
      ?.querySelectorAll<HTMLImageElement>(".product-frame")
      .forEach((image) => {
        if (image.complete && image.naturalWidth) {
          fitFrame(image);
          if (image.classList.contains("product-frame-current")) {
            setReadyImage(images[active].src);
            photoCache.current?.remember(images[active].src, image);
          }
        }
      });
  }, [active, previous, images]);

  useLayoutEffect(() => {
    if (!turning || previous === null || reduced) return;
    // A second choice during a turn starts a complete cycle for the new photo,
    // without replacing its DOM frame or inheriting the earlier turn's clock.
    for (const animation of framePair.current?.getAnimations?.() ?? []) {
      if ((animation as CSSAnimation).animationName === "product-photo-turn") {
        animation.currentTime = 0;
      }
    }
  }, [active, previous, reduced, turning]);

  const disposePhotos = useCallback(() => {
    request.current++;
    photoCache.current?.dispose();
    photoCache.current = null;
  }, []);
  useEffect(() => {
    setEnhanced(true);
    if (!photoCache.current) photoCache.current = createGalleryPhotoCache();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(preference.matches);
      if (preference.matches) {
        finishTurn.current?.();
        setPackageTurn(null);
        request.current++;
        pending.current = null;
        setLoading(false);
        setPrevious(null);
      }
    };
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = window.IntersectionObserver
      ? new IntersectionObserver(
          ([entry]) => setVisible(entry.isIntersecting),
          { threshold: 0.15 },
        )
      : null;
    if (observer && root.current) observer.observe(root.current);
    else setVisible(true);
    return () => {
      disposePhotos();
      observer?.disconnect();
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [disposePhotos]);

  useEffect(() => {
    visibleRef.current = visible;
    if (!visible || !documentVisible || modalOpen) {
      finishTurn.current?.();
      setPackageTurn(null);
      // A mobile swatch may be below the photograph. Finish that explicit
      // choice even when scrolling to it moves the gallery offscreen.
      if (documentVisible && explicitSelectionPending.current) {
        setPrevious(null);
        return;
      }
      request.current++;
      pending.current = null;
      setLoading(false);
      setPrevious(null);
      photoCache.current?.cancelPending();
    }
  }, [visible, documentVisible, modalOpen]);

  useEffect(() => {
    if (
      !automatic ||
      reduced ||
      modalOpen ||
      (mode === "card" && !hovered && !interacting) ||
      !visible ||
      !documentVisible ||
      readyImage !== images[active].src
    )
      return;
    // Warm only the next photo while visible, rather than downloading a whole gallery.
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    void photoCache.current
      ?.load(
        images[(active + 1) % images.length].src,
        "low",
        images[(active + 1) % images.length],
      )
      .catch(() => {});
    for (const image of images[active].turnImages ?? []) {
      void photoCache.current?.load(image.src, "low", image).catch(() => {});
    }
  }, [
    automatic,
    reduced,
    modalOpen,
    mode,
    hovered,
    interacting,
    visible,
    documentVisible,
    active,
    images,
    readyImage,
  ]);

  useEffect(() => {
    if (
      !flavorNavigation ||
      modalOpen ||
      (mode === "card" && !hovered && !interacting) ||
      !visible ||
      !documentVisible ||
      (images[active].src && readyImage !== images[active].src)
    )
      return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    // Prepare just the front photograph of each adjacent variant after the
    // initial content. No eager traversal of all variants or gallery photos.
    const timer = window.setTimeout(() => {
      if (!reduced)
        for (const angle of images[active].turnImages ?? []) {
          void photoCache.current
            ?.load(angle.src, "low", angle)
            .catch(() => {});
        }
      const ids = [...new Set(images.map((image) => image.variantId))];
      const index = ids.indexOf(images[active].variantId);
      for (const direction of [-1, 1]) {
        const id = ids[(index + direction + ids.length) % ids.length];
        const next = images.find((image) => image.variantId === id);
        if (next?.src)
          void photoCache.current?.load(next.src, "low", next).catch(() => {});
        if (next) onPrepareImage?.(next);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [
    flavorNavigation,
    modalOpen,
    mode,
    hovered,
    interacting,
    visible,
    documentVisible,
    active,
    images,
    onPrepareImage,
    readyImage,
    reduced,
  ]);

  const showImage = useCallback(
    (index: number, allowOffscreen = false) => {
      const sequence = ++request.current;
      setPackageTurn(null);
      finishTurn.current = null;
      setInspected(null);
      explicitSelectionPending.current = allowOffscreen;
      if (index === activeIndex.current) {
        explicitSelectionPending.current = false;
        pending.current = null;
        setLoading(false);
        return;
      }
      pending.current = index;
      setLoading(true);
      const settleImage = (withTransition = true) => {
        if (request.current !== sequence) return;
        finishTurn.current = null;
        setPackageTurn(null);
        setPrevious(
          !withTransition ||
            reduced ||
            !visibleRef.current ||
            document.querySelector("dialog:modal")
            ? null
            : activeIndex.current,
        );
        activeIndex.current = index;
        setActive(index);
        pending.current = null;
        explicitSelectionPending.current = false;
        setLoading(false);
        onImageChange?.(images[index]);
        setMessage("");
      };
      const commitImage = () => {
        if (request.current !== sequence) return;
        const from = images[activeIndex.current];
        const availableAngles =
          from.turnImages?.filter((image) =>
            photoCache.current?.has(image.src),
          ) ?? [];
        if (
          turning &&
          availableAngles.length &&
          from.variantId !== images[index].variantId &&
          !reduced &&
          visibleRef.current &&
          !document.querySelector("dialog:modal") &&
          images[index].src
        ) {
          finishTurn.current = () => settleImage(false);
          setPackageTurn({
            from: {
              ...from,
              turnImages: availableAngles,
            },
            to: images[index],
            sequence,
          });
        } else settleImage();
      };
      const angles =
        turning && !reduced
          ? (images[activeIndex.current].turnImages ?? [])
          : [];
      // Angle failures are decorative: preserve the decoded target and fall
      // back to the existing transition instead of blocking a purchase.
      const prepareAngles = async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
          Promise.all(
            angles.map((image) =>
              photoCache.current?.load(image.src, "high", image),
            ),
          ).catch(() => {}),
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, 450);
          }),
        ]);
        clearTimeout(timer);
      };
      if (prepareImage) {
        void Promise.all([
          images[index].src && !photoCache.current?.has(images[index].src)
            ? photoCache.current?.load(images[index].src, "high", images[index])
            : undefined,
          prepareImage(images[index]),
          prepareAngles(),
        ])
          .then(commitImage)
          .catch(() => {
            if (request.current !== sequence) return;
            pending.current = null;
            explicitSelectionPending.current = false;
            setLoading(false);
            setPaused(true);
            setMessage(
              "No pudimos cargar esta imagen. Podés intentar otra vez.",
            );
          });
        return;
      }
      if (!images[index].src) {
        commitImage();
        return;
      }
      if (
        photoCache.current?.has(images[index].src) &&
        angles.every((image) => photoCache.current?.has(image.src))
      ) {
        commitImage();
        return;
      }
      void Promise.all([
        photoCache.current?.load(images[index].src, "high", images[index]),
        prepareAngles(),
      ])
        .then(commitImage)
        .catch(() => {
          if (request.current !== sequence) return;
          pending.current = null;
          explicitSelectionPending.current = false;
          setLoading(false);
          setPaused(true);
          setMessage("No pudimos cargar esta imagen. Podés intentar otra vez.");
        });
    },
    [images, reduced, onImageChange, prepareImage, turning],
  );

  useEffect(() => {
    if (!selectionRequest || processedSelection.current === selectionRequest)
      return;
    processedSelection.current = selectionRequest;
    const index = images.findIndex(
      (image) => image.variantId === selectionRequest.variantId,
    );
    if (index >= 0) showImage(index, true);
  }, [selectionRequest, images, showImage]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => {
        firstAutomaticChange.current = false;
        showImage((active + 1) % images.length);
      },
      delay + (firstAutomaticChange.current ? startDelay : 0),
    );
    return () => window.clearTimeout(timer);
  }, [playing, active, images.length, delay, startDelay, showImage]);

  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(
      () => setPrevious(null),
      // animationend owns the normal turn cleanup. This is only a fallback
      // for browsers that cancel an animation without dispatching that event.
      turning
        ? (flavorNavigation ? 660 : 900) + 250
        : transition === "fade"
          ? 270
          : mode === "card"
            ? 860
            : 360,
    );
    return () => window.clearTimeout(timer);
  }, [previous, active, mode, turning, flavorNavigation, transition]);

  function choose(index: number) {
    setPaused(true);
    showImage(index);
  }
  if (!images.length) return null;
  const current = images[active] ?? images[0];
  const variantIds = [...new Set(images.map((image) => image.variantId))];
  const visiblePhotos = images
    .map((image, index) => ({ image, index }))
    .filter(
      ({ image }) => !flavorNavigation || image.variantId === current.variantId,
    );
  function chooseFlavor(direction: number) {
    const from = images[pending.current ?? activeIndex.current].variantId;
    const nextVariant =
      variantIds[
        (variantIds.indexOf(from) + direction + variantIds.length) %
          variantIds.length
      ];
    choose(images.findIndex((image) => image.variantId === nextVariant));
  }
  const frames = (
    <>
      {packageTurn && (
        <PackageTurn
          turn={packageTurn}
          onFinish={() => finishTurn.current?.()}
        />
      )}
      <span
        ref={framePair}
        className="product-frame-pair"
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.animationName === "product-photo-turn"
          ) {
            setPrevious(null);
          }
        }}
      >
        {previous !== null && images[previous]?.src && (
          <img
            className="product-frame product-frame-outgoing"
            crossOrigin="anonymous"
            src={images[previous].src}
            srcSet={images[previous].srcSet}
            sizes={images[previous].sizes}
            alt=""
            aria-hidden="true"
            width={720}
            height={720}
            decoding="async"
            onLoad={frameLoaded}
          />
        )}
        {current.src ? (
          <img
            key={current.id}
            className="product-frame product-frame-current"
            crossOrigin="anonymous"
            src={current.src}
            srcSet={current.srcSet}
            sizes={current.sizes}
            alt={current.alt}
            width={720}
            height={720}
            loading={mode === "card" && !eager ? "lazy" : "eager"}
            fetchPriority={mode === "detail" || eager ? "high" : "auto"}
            decoding="async"
            onLoad={(event) => {
              frameLoaded(event);
              photoCache.current?.remember(current.src, event.currentTarget);
              setReadyImage(current.src);
            }}
          />
        ) : (
          <span
            className="product-frame product-frame-current product-no-photo"
            role="img"
            aria-label={`Imagen del producto pendiente · ${current.alt}`}
          >
            <Icon name="bag" />
            <span>Imagen del producto pendiente</span>
          </span>
        )}
      </span>
      {turning && current.src && (
        <img
          key={`settled:${current.id}`}
          className="product-frame product-frame-settled"
          crossOrigin="anonymous"
          src={current.src}
          srcSet={current.srcSet}
          sizes={current.sizes}
          alt=""
          aria-hidden="true"
          width={720}
          height={720}
          loading={mode === "card" ? "lazy" : "eager"}
          decoding="async"
          fetchPriority={mode === "detail" ? "high" : "auto"}
          onLoad={frameLoaded}
        />
      )}
      {mode === "card" &&
        !turning &&
        previous !== null &&
        !reduced &&
        images[previous] && (
          <span
            key={`${images[previous].id}:${current.id}`}
            className="product-image-fragments"
            aria-hidden="true"
          >
            {fragments.map((style, index) => (
              <span
                key={index}
                className="product-image-fragment"
                style={style}
              >
                <img
                  className="product-frame"
                  crossOrigin="anonymous"
                  src={index % 2 ? current.src : images[previous].src}
                  srcSet={index % 2 ? current.srcSet : images[previous].srcSet}
                  sizes={index % 2 ? current.sizes : images[previous].sizes}
                  alt=""
                  width={720}
                  height={720}
                  decoding="async"
                  onLoad={frameLoaded}
                />
              </span>
            ))}
          </span>
        )}
    </>
  );
  return (
    <div
      ref={root}
      className={`product-image-gallery product-image-gallery-${mode}${packageTurn ? " product-gallery-turning" : ""}${showThumbnails && mode === "detail" && visiblePhotos.length + (current.turnImages?.length ?? 0) + informationImages.length > 1 ? " product-gallery-with-rail" : ""}`}
      data-package-turn={packageTurn ? "true" : undefined}
      data-normalized={current.normalized ? "true" : undefined}
      data-inspecting={inspected ? "true" : undefined}
      data-auto-playing={playing ? "true" : undefined}
      data-transition={
        turning ? "turn" : transition === "fade" ? "fade" : undefined
      }
      data-flavor-navigation={flavorNavigation ? "true" : undefined}
      data-loading={loading && !packageTurn ? "true" : undefined}
      data-animated={previous !== null && !reduced ? "true" : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerDownCapture={(event) => {
        if (event.pointerType !== "mouse") setHovered(true);
      }}
      onPointerUpCapture={(event) => {
        if (event.pointerType !== "mouse") setHovered(false);
      }}
      onPointerCancel={() => setHovered(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
    >
      <div
        className="product-image-stage"
        onPointerDown={(event) => {
          if (
            mode !== "detail" ||
            event.pointerType === "mouse" ||
            !event.isPrimary ||
            (event.target as Element).closest("a, button")
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
          const direction = x < 0 ? 1 : -1;
          if (flavorNavigation && variantIds.length > 1)
            chooseFlavor(direction);
          else if (multiple)
            choose((active + direction + images.length) % images.length);
        }}
      >
        {inspected && (
          <div
            className="product-inspected-image"
            data-information={inspected.information || undefined}
          >
            <img
              src={inspected.src}
              alt={inspected.alt}
              width={720}
              height={720}
              decoding="async"
            />
          </div>
        )}
        {href ? (
          <Link
            href={current.href ?? href}
            className="product-frame-link"
            aria-label={
              current.src
                ? linkLabel
                : `Imagen del producto pendiente · ${linkLabel ?? current.alt}`
            }
          >
            {frames}
          </Link>
        ) : (
          <div className="product-frame-link">{frames}</div>
        )}
        {mode === "detail" && !flavorNavigation && multiple && (
          <span className="product-image-count" aria-hidden="true">
            {String(active + 1).padStart(2, "0")}{" "}
            <span>/ {String(images.length).padStart(2, "0")}</span>
          </span>
        )}
        {flavorNavigation && enhanced && variantIds.length > 1 && (
          <div
            className="flavor-navigation"
            role="group"
            aria-label="Elegir sabor"
            aria-busy={loading}
          >
            <button
              type="button"
              aria-label="Sabor anterior"
              onClick={() => chooseFlavor(-1)}
            >
              <Icon name="arrow" className="gallery-back" />
            </button>
            <button
              type="button"
              aria-label="Sabor siguiente"
              onClick={() => chooseFlavor(1)}
            >
              <Icon name="arrow" />
            </button>
          </div>
        )}
        {mode === "detail" && !flavorNavigation && enhanced && multiple && (
          <div
            className="product-gallery-controls"
            role="group"
            aria-label="Recorrer imágenes"
          >
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={() =>
                choose((active - 1 + images.length) % images.length)
              }
            >
              <Icon name="arrow" className="gallery-back" />
            </button>
            <div className="product-gallery-progress" aria-hidden="true">
              {images.map((image, index) => (
                <span
                  key={image.id}
                  data-current={index === active ? "true" : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Siguiente imagen"
              onClick={() => choose((active + 1) % images.length)}
            >
              <Icon name="arrow" />
            </button>
          </div>
        )}
      </div>
      {flavorNavigation && enhanced && (
        <p className="flavor-loading" role="status">
          {loading && <span>Cargando sabor…</span>}
        </p>
      )}
      {mode === "detail" && showThumbnails && (
        <ProductThumbnailRail
          images={[
            ...visiblePhotos.map(({ image }) => image),
            ...(current.turnImages ?? []),
            ...informationImages,
          ]}
          selectedId={inspected?.id ?? current.id}
          onSelect={(image) => {
            const index = images.findIndex((entry) => entry.id === image.id);
            if (index >= 0) {
              setInspected(null);
              choose(index);
            } else {
              finishTurn.current?.();
              const sequence = ++request.current;
              setLoading(true);
              void photoCache.current
                ?.load(image.src, "high", image)
                .then(() => {
                  if (request.current !== sequence) return;
                  setInspected(image);
                  setLoading(false);
                  setMessage("");
                })
                .catch(() => {
                  if (request.current !== sequence) return;
                  setLoading(false);
                  setMessage(
                    "No pudimos cargar esta imagen. Podés intentar otra vez.",
                  );
                });
            }
          }}
        />
      )}
      {message && (
        <p className="gallery-message" role="status">
          {message}
        </p>
      )}
      {multiple && (
        <noscript>
          <div className="product-static-images">
            {images.slice(1).map((image) => (
              <a key={image.id} href={image.href ?? image.src}>
                Ver {image.alt}
              </a>
            ))}
          </div>
        </noscript>
      )}
    </div>
  );
}
