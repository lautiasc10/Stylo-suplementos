"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  variantInformationImages,
  type Product,
  type ProductImage,
} from "@/modules/catalog/model";
import { Icon } from "@/components/ui/icon";
import Image from "next/image";
import { normalizedPhotoProps } from "@/modules/catalog/normalized-media";

export function ProductInformation({
  product,
  variantId,
  imageBase,
  imageUrls,
}: {
  product: Product;
  variantId: string;
  imageBase: string;
  imageUrls: Record<string, string>;
}) {
  const images = variantInformationImages(product, variantId);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLAnchorElement | null>(null);
  const [selected, setSelected] = useState<ProductImage | null>(null);
  const titleId = useId();
  const original = (image: ProductImage) =>
    imageUrls[image.path] || `${imageBase}/${image.path}`;
  const delivery = (image: ProductImage) =>
    normalizedPhotoProps(original(image), "detail", {
      path: image.path,
      imageBase,
    });
  const source = (image: ProductImage) =>
    delivery(image).src || original(image);
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);
  useEffect(() => {
    dialog.current?.close();
    setSelected(null);
  }, [variantId]);
  function close() {
    dialog.current?.close();
    setSelected(null);
    opener.current?.focus({ preventScroll: true });
  }
  if (!images.length) return null;
  return (
    <section
      className="product-information"
      aria-label="Información del producto"
    >
      <details>
        <summary>
          <h2>Información del producto</h2>
          <Icon name="arrow" className="product-information-chevron" />
        </summary>
        <p className="product-information-note">
          Consultá las fichas del fabricante. Seleccioná una imagen para
          ampliarla.
        </p>
        <ul className="product-information-grid">
          {images.map((image) => (
            <li key={image.id}>
              <a
                href={source(image)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    !dialog.current?.showModal
                  )
                    return;
                  event.preventDefault();
                  opener.current = event.currentTarget;
                  setSelected(image);
                  dialog.current.showModal();
                }}
              >
                <div className="product-information-thumbnail">
                  <Image
                    unoptimized
                    src={delivery(image).thumbnailSrc || source(image)}
                    alt=""
                    width={480}
                    height={320}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span className="product-information-caption">
                  {image.alt}
                  <span aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </details>
      <dialog
        ref={dialog}
        className="product-information-dialog"
        aria-labelledby={titleId}
        onClose={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="product-information-viewer">
          <div className="product-information-viewer-header">
            <h2 id={titleId}>{selected?.alt || "Ficha del fabricante"}</h2>
            <button
              type="button"
              className="button button-outline"
              onClick={close}
              autoFocus
              aria-label="Cerrar ficha informativa"
            >
              <Icon name="close" /> Cerrar
            </button>
          </div>
          {selected && (
            <div className="product-information-full">
              <Image
                unoptimized
                src={source(selected)}
                alt={selected.alt}
                width={1000}
                height={1000}
                decoding="async"
              />
            </div>
          )}
          {selected && (
            <a
              className="text-link"
              href={original(selected)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir imagen original ↗
            </a>
          )}
        </div>
      </dialog>
    </section>
  );
}
