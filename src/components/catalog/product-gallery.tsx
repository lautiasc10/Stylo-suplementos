"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Icon } from "@/components/ui/icon";

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  variantId?: string;
  href?: string;
};

// Six temporary fragments reuse the two loaded photos; no canvas or extra media.
const glitchFragments = [
  {
    clip: "polygon(0 0,100% 0,100% 19%,0 27%)",
    shift: "4%",
    lift: "-1%",
    tilt: "-1deg",
  },
  {
    clip: "polygon(0 27%,100% 19%,100% 38%,0 34%)",
    shift: "-5%",
    lift: "1%",
    tilt: "1deg",
  },
  {
    clip: "polygon(0 34%,100% 38%,100% 51%,0 57%)",
    shift: "6%",
    lift: "-1%",
    tilt: "-1.5deg",
  },
  {
    clip: "polygon(0 57%,100% 51%,100% 69%,0 64%)",
    shift: "-4%",
    lift: "2%",
    tilt: "1deg",
  },
  {
    clip: "polygon(0 64%,100% 69%,100% 83%,0 87%)",
    shift: "3%",
    lift: "-1%",
    tilt: "-.5deg",
  },
  {
    clip: "polygon(0 87%,100% 83%,100% 100%,0 100%)",
    shift: "-3%",
    lift: "1%",
    tilt: ".5deg",
  },
];

export function ProductGallery({
  images,
  href,
  linkLabel,
  mode = "card",
  delay = 5200,
  onImageChange,
}: {
  images: GalleryImage[];
  href?: string;
  linkLabel?: string;
  mode?: "card" | "detail";
  delay?: number;
  onImageChange?: (image: GalleryImage) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [message, setMessage] = useState("");
  const multiple = images.length > 1;
  const automatic = mode === "card" && multiple;

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
    return () => {
      request.current++;
      observer?.disconnect();
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const showImage = useCallback(
    (index: number, nextDirection: number) => {
      const sequence = ++request.current;
      if (index === active) return;
      const image = new window.Image();
      image.onload = () => {
        if (request.current !== sequence) return;
        setPrevious(reduced ? null : active);
        setDirection(nextDirection);
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
    if (
      !automatic ||
      reduced ||
      paused ||
      interacting ||
      !visible ||
      !documentVisible
    )
      return;
    const timer = window.setTimeout(
      () => showImage((active + 1) % images.length, 1),
      delay,
    );
    return () => window.clearTimeout(timer);
  }, [
    automatic,
    reduced,
    paused,
    interacting,
    visible,
    documentVisible,
    active,
    images.length,
    delay,
    showImage,
  ]);

  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), 480);
    return () => window.clearTimeout(timer);
  }, [previous, active]);

  function choose(index: number, nextDirection: number) {
    setPaused(true);
    showImage(index, nextDirection);
  }
  if (!images.length) return null;
  const current = images[active] ?? images[0];
  const frames = (
    <>
      {previous !== null && images[previous] && (
        <img
          className="product-frame product-frame-outgoing"
          src={images[previous].src}
          alt=""
          aria-hidden="true"
          width={720}
          height={720}
          decoding="async"
        />
      )}
      <img
        key={current.id}
        className="product-frame product-frame-current"
        src={current.src}
        alt={current.alt}
        width={720}
        height={720}
        loading={mode === "card" ? "lazy" : "eager"}
        decoding="async"
      />
      {mode === "card" && previous !== null && !reduced && images[previous] && (
        <span
          key={`${images[previous].id}:${current.id}`}
          className="product-glitch-fragments"
          aria-hidden="true"
        >
          {glitchFragments.map((fragment, index) => (
            <span
              key={index}
              className="product-glitch-fragment"
              style={
                {
                  clipPath: fragment.clip,
                  "--glitch-shift": fragment.shift,
                  "--glitch-lift": fragment.lift,
                  "--glitch-tilt": fragment.tilt,
                } as CSSProperties
              }
            >
              <img
                className="product-frame"
                src={index % 2 ? current.src : images[previous].src}
                alt=""
                width={720}
                height={720}
                decoding="async"
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
      data-animated={previous !== null && !reduced ? "true" : undefined}
      style={{ "--gallery-direction": direction } as CSSProperties}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
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
        {multiple && (
          <span className="product-image-count" aria-hidden="true">
            {String(active + 1).padStart(2, "0")}{" "}
            <span>/ {String(images.length).padStart(2, "0")}</span>
          </span>
        )}
        {enhanced && multiple && (
          <div
            className="product-gallery-controls"
            role="group"
            aria-label="Recorrer imágenes"
          >
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={() =>
                choose((active - 1 + images.length) % images.length, -1)
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
            {automatic && !reduced && (
              <button
                type="button"
                aria-label={
                  paused
                    ? "Reanudar cambio automático de imágenes"
                    : "Pausar cambio automático de imágenes"
                }
                onClick={() => {
                  request.current++;
                  setPaused(!paused);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                  {paused ? (
                    <path d="M8 5v14l11-7Z" />
                  ) : (
                    <path d="M7 5h3v14H7zm7 0h3v14h-3z" />
                  )}
                </svg>
              </button>
            )}
            <button
              type="button"
              aria-label="Siguiente imagen"
              onClick={() => choose((active + 1) % images.length, 1)}
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
              onClick={() => choose(index, index > active ? 1 : -1)}
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
