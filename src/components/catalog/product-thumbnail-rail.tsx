"use client";

import { useRef, useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import Image from "next/image";
import type { GalleryImage } from "./product-gallery";

export function ProductThumbnailRail({
  images,
  selectedId,
  onSelect,
}: {
  images: GalleryImage[];
  selectedId: string;
  onSelect: (image: GalleryImage) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  function measure() {
    const node = viewport.current;
    if (!node) return;
    const horizontal = matchMedia("(max-width: 959px)").matches;
    const position = horizontal ? node.scrollLeft : node.scrollTop;
    const extent = horizontal
      ? node.scrollWidth - node.clientWidth
      : node.scrollHeight - node.clientHeight;
    setEdges({ start: position < 2, end: position >= extent - 2 });
  }
  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [images]);
  function scroll(direction: number) {
    const horizontal = matchMedia("(max-width: 959px)").matches;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.current?.scrollBy({
      [horizontal ? "left" : "top"]: direction * 180,
      behavior: reduced ? "instant" : "smooth",
    });
  }
  if (images.length < 2) return null;
  return (
    <div
      className="product-thumbnail-rail"
      role="group"
      aria-label="Galería del producto"
    >
      <button
        type="button"
        className="thumbnail-scroll thumbnail-scroll-back"
        aria-label="Ver miniaturas anteriores"
        disabled={edges.start}
        onClick={() => scroll(-1)}
      >
        <Icon name="arrow" />
      </button>
      <div
        ref={viewport}
        className="product-thumbnail-viewport"
        onScroll={measure}
      >
        {images.map((image) => (
          <a
            key={image.id}
            href={image.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver ${image.alt}`}
            aria-current={selectedId === image.id ? "true" : undefined}
            onClick={(event) => {
              if (
                event.button ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              onSelect(image);
            }}
          >
            <Image
              unoptimized
              src={image.thumbnailSrc ?? image.src}
              alt=""
              width={80}
              height={100}
              loading="lazy"
              decoding="async"
            />
          </a>
        ))}
      </div>
      <button
        type="button"
        className="thumbnail-scroll thumbnail-scroll-next"
        aria-label="Ver más miniaturas"
        disabled={edges.end}
        onClick={() => scroll(1)}
      >
        <Icon name="arrow" />
      </button>
    </div>
  );
}
