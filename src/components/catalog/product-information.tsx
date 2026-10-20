"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  variantInformationImages,
  packagingLabel,
  type Product,
  type ProductImage,
} from "@/modules/catalog/model";
import { Icon } from "@/components/ui/icon";

export function ProductInformation({
  product,
  brandName,
  variantId,
  imageBase,
  imageUrls,
}: {
  product: Product;
  brandName?: string;
  variantId: string;
  imageBase: string;
  imageUrls: Record<string, string>;
}) {
  const images = variantInformationImages(product, variantId);
  const variant =
    product.variants.find((item) => item.id === variantId) ??
    product.variants[0];
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLAnchorElement | null>(null);
  const [selected, setSelected] = useState<ProductImage | null>(null);
  const titleId = useId();
  const source = (image: ProductImage) =>
    imageUrls[image.path] || `${imageBase}/${image.path}`;
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
  return (
    <section
      className="product-information"
      aria-label="Información del producto"
    >
      <details>
        <summary>
          <h2>Información del producto</h2>
          <span
            className="product-information-chevron product-information-toggle"
            aria-hidden="true"
          />
        </summary>
        <div className="product-information-description">
          {product.description && (
            <p className="product-description">{product.description}</p>
          )}
          <dl className="product-information-facts">
            {brandName && (
              <div>
                <dt>Marca</dt>
                <dd>{brandName}</dd>
              </div>
            )}
            {variant.size && (
              <div>
                <dt>Contenido</dt>
                <dd>{variant.size}</dd>
              </div>
            )}
            {variant.presentation && (
              <div>
                <dt>Presentación</dt>
                <dd>{packagingLabel(variant.presentation)}</dd>
              </div>
            )}
          </dl>
        </div>
        {images.length > 0 && (
          <>
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
                      <img
                        src={source(image)}
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
          </>
        )}
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
              <img src={source(selected)} alt={selected.alt} decoding="async" />
            </div>
          )}
          {selected && (
            <a
              className="text-link"
              href={source(selected)}
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
