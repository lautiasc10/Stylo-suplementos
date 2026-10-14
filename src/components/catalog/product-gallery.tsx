"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
  type ReactNode,
} from "react";
import { Icon } from "@/components/ui/icon";
import { flavorIngredient, ingredientSource } from "./flavor-ingredients";
import { fitProductPhoto } from "./product-photo-fit";

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  variantId?: string;
  flavor?: string;
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

function fitFrame(image: HTMLImageElement) {
  fitProductPhoto(image);
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
  ingredients,
}: {
  images: GalleryImage[];
  href?: string;
  linkLabel?: string;
  mode?: "card" | "detail";
  delay?: number;
  startDelay?: number;
  onImageChange?: (image: GalleryImage) => void;
  ingredients?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  const firstAutomaticChange = useRef(true);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [message, setMessage] = useState("");
  const multiple = images.length > 1;
  const automatic =
    mode === "card" &&
    multiple &&
    images.some((image) => image.src !== images[0].src);
  const playing =
    automatic &&
    !reduced &&
    !paused &&
    !interacting &&
    visible &&
    documentVisible;

  useEffect(() => {
    root.current
      ?.querySelectorAll<HTMLImageElement>(".product-frame")
      .forEach((image) => {
        if (image.complete && image.naturalWidth) fitFrame(image);
      });
  }, [active, previous]);

  useEffect(() => {
    const stage = root.current?.querySelector(".product-image-stage");
    if (!stage || !window.ResizeObserver) return;
    const observer = new ResizeObserver(() => {
      root.current
        ?.querySelectorAll<HTMLImageElement>(".product-frame")
        .forEach((image) => {
          if (image.complete && image.naturalWidth) fitFrame(image);
        });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setEnhanced(true);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(preference.matches);
      if (preference.matches) {
        request.current++;
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
    };
  }, []);

  useEffect(() => {
    if (!visible || !documentVisible) {
      request.current++;
      setPrevious(null);
    }
  }, [visible, documentVisible]);

  useEffect(() => {
    if (!automatic || reduced || !visible || !documentVisible) return;
    // Warm only the next photo while visible, rather than downloading a whole gallery.
    const next = new window.Image();
    next.crossOrigin = "anonymous";
    next.decoding = "async";
    next.src = images[(active + 1) % images.length].src;
    const ingredient = flavorIngredient(
      images[(active + 1) % images.length].flavor,
    );
    if (ingredient) {
      const decoration = new window.Image();
      decoration.src = ingredientSource(ingredient);
    }
  }, [automatic, reduced, visible, documentVisible, active, images]);

  const showImage = useCallback(
    (index: number) => {
      const sequence = ++request.current;
      if (index === active) return;
      const image = new window.Image();
      image.crossOrigin = "anonymous";
      image.onload = async () => {
        // Wait for decoding as well as download before revealing fragments.
        try {
          await image.decode();
        } catch {
          image.onerror?.(new Event("error"));
          return;
        }
        if (request.current !== sequence) return;
        setPrevious(reduced ? null : active);
        setActive(index);
        onImageChange?.(images[index]);
        setMessage("");
      };
      image.onerror = () => {
        if (request.current !== sequence) return;
        setPaused(true);
        setMessage("No pudimos cargar esta imagen. Podés intentar otra vez.");
      };
      // Load only the requested photograph; keep the current one until it is ready.
      image.src = images[index].src;
    },
    [active, images, reduced, onImageChange],
  );

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
      mode === "card" ? 860 : 360,
    );
    return () => window.clearTimeout(timer);
  }, [previous, active, mode]);

  function choose(index: number) {
    setPaused(true);
    showImage(index);
  }
  if (!images.length) return null;
  const current = images[active] ?? images[0];
  const frames = (
    <>
      {previous !== null && images[previous] && (
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
      <img
        key={current.id}
        className="product-frame product-frame-current"
        crossOrigin="anonymous"
        src={current.src}
        alt={current.alt}
        width={720}
        height={720}
        loading={mode === "card" ? "lazy" : "eager"}
        decoding="async"
        onLoad={frameLoaded}
      />
      {mode === "card" && previous !== null && !reduced && images[previous] && (
        <span
          key={`${images[previous].id}:${current.id}`}
          className="product-image-fragments"
          aria-hidden="true"
        >
          {fragments.map((style, index) => (
            <span key={index} className="product-image-fragment" style={style}>
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
      data-animated={previous !== null && !reduced ? "true" : undefined}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
    >
      <div className="product-image-stage">
        {ingredients}
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
        {mode === "detail" && multiple && (
          <span className="product-image-count" aria-hidden="true">
            {String(active + 1).padStart(2, "0")}{" "}
            <span>/ {String(images.length).padStart(2, "0")}</span>
          </span>
        )}
        {mode === "detail" && enhanced && multiple && (
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
      {mode === "detail" && enhanced && multiple && (
        <div className="product-thumbnails" aria-label="Galería del producto">
          {images.map((image, index) => (
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
