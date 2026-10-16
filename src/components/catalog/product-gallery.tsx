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

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  variantId?: string;
  href?: string;
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

export function ProductGallery({
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
}: {
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
}) {
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
  const activeIndex = useRef(active);
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [readyImage, setReadyImage] = useState<string | null>(null);
  const pending = useRef<number | null>(null);
  const processedSelection = useRef<typeof selectionRequest>(null);
  const explicitSelectionPending = useRef(false);
  const visibleRef = useRef(false);
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
    documentVisible;

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

  useEffect(() => {
    setEnhanced(true);
    if (!photoCache.current) photoCache.current = createGalleryPhotoCache();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(preference.matches);
      if (preference.matches) {
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
      request.current++;
      observer?.disconnect();
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      photoCache.current?.dispose();
      photoCache.current = null;
    };
  }, []);

  useEffect(() => {
    visibleRef.current = visible;
    if (!visible || !documentVisible) {
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
  }, [visible, documentVisible]);

  useEffect(() => {
    if (
      !automatic ||
      reduced ||
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
      ?.load(images[(active + 1) % images.length].src, "low")
      .catch(() => {});
  }, [
    automatic,
    reduced,
    visible,
    documentVisible,
    active,
    images,
    readyImage,
  ]);

  useEffect(() => {
    if (
      !flavorNavigation ||
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
      const ids = [...new Set(images.map((image) => image.variantId))];
      const index = ids.indexOf(images[active].variantId);
      for (const direction of [-1, 1]) {
        const id = ids[(index + direction + ids.length) % ids.length];
        const next = images.find((image) => image.variantId === id);
        if (next?.src)
          void photoCache.current?.load(next.src, "low").catch(() => {});
        if (next) onPrepareImage?.(next);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [
    flavorNavigation,
    visible,
    documentVisible,
    active,
    images,
    onPrepareImage,
    readyImage,
  ]);

  const showImage = useCallback(
    (index: number, allowOffscreen = false) => {
      const sequence = ++request.current;
      explicitSelectionPending.current = allowOffscreen;
      if (index === activeIndex.current) {
        explicitSelectionPending.current = false;
        pending.current = null;
        setLoading(false);
        return;
      }
      pending.current = index;
      setLoading(true);
      const commitImage = () => {
        if (request.current !== sequence) return;
        setPrevious(
          reduced || !visibleRef.current ? null : activeIndex.current,
        );
        activeIndex.current = index;
        setActive(index);
        pending.current = null;
        explicitSelectionPending.current = false;
        setLoading(false);
        onImageChange?.(images[index]);
        setMessage("");
      };
      if (prepareImage) {
        void Promise.all([
          images[index].src && !photoCache.current?.has(images[index].src)
            ? photoCache.current?.load(images[index].src)
            : undefined,
          prepareImage(images[index]),
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
      if (photoCache.current?.has(images[index].src)) {
        commitImage();
        return;
      }
      void photoCache.current
        ?.load(images[index].src)
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
    [images, reduced, onImageChange, prepareImage],
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
            alt={current.alt}
            width={720}
            height={720}
            loading={mode === "card" ? "lazy" : "eager"}
            fetchPriority={mode === "detail" ? "high" : "auto"}
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
            aria-label={current.alt}
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
      className={`product-image-gallery product-image-gallery-${mode}`}
      data-auto-playing={playing ? "true" : undefined}
      data-transition={
        turning ? "turn" : transition === "fade" ? "fade" : undefined
      }
      data-flavor-navigation={flavorNavigation ? "true" : undefined}
      data-loading={loading ? "true" : undefined}
      data-animated={previous !== null && !reduced ? "true" : undefined}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
    >
      <div className="product-image-stage">
        {href ? (
          <Link
            href={current.href ?? href}
            className="product-frame-link"
            aria-label={linkLabel}
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
      {mode === "detail" && enhanced && visiblePhotos.length > 1 && (
        <div className="product-thumbnails" aria-label="Galería del producto">
          {visiblePhotos.map(({ image, index }) => (
            <button
              type="button"
              key={image.id}
              aria-label={`Ver ${image.alt}`}
              aria-pressed={active === index}
              onClick={() => choose(index)}
            >
              <img
                src={image.src}
                alt=""
                width={80}
                height={80}
                loading="lazy"
              />
            </button>
          ))}
        </div>
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
