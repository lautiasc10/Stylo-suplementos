"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddToCart } from "@/components/commerce/add-to-cart";
import { ProductPricing } from "@/components/commerce/product-pricing";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import { variantImages, variantLabel } from "@/modules/catalog/model";
import { GainerBackdrop } from "./gainer-backdrop";
import {
  gainerIngredientKey,
  gainerIngredientSources,
} from "./gainer-ingredients";
import { createGalleryPhotoCache } from "./gallery-photo-cache";
import { ProductGallery, type GalleryImage } from "./product-gallery";
import type { ProductDetailProps } from "./product-detail";

const emptyImages: Record<string, string> = {};

/** Isolated mass-gainer trial; the other product experiences retain their UI. */
export function GainerProductDetail({
  product,
  brandName,
  selectedId,
  imageBase = "",
  imageUrls = emptyImages,
  preview = false,
}: ProductDetailProps) {
  const root = useRef<HTMLDivElement>(null);
  const ingredientCache = useRef<ReturnType<
    typeof createGalleryPhotoCache
  > | null>(null);
  const [variantId, setVariantId] = useState(
    selectedId ?? product.variants[0].id,
  );
  const variant =
    product.variants.find((item) => item.id === variantId) ??
    product.variants[0];
  const [enhanced, setEnhanced] = useState(false);
  const [selectionRequest, setSelectionRequest] = useState<{
    variantId: string;
    nonce: number;
  } | null>(null);
  useEffect(() => setEnhanced(true), []);
  useEffect(() => {
    const cache = createGalleryPhotoCache();
    ingredientCache.current = cache;
    const stopHiddenLoads = () => {
      if (document.hidden) cache.cancelPending();
    };
    document.addEventListener("visibilitychange", stopHiddenLoads);
    return () => {
      document.removeEventListener("visibilitychange", stopHiddenLoads);
      cache.dispose();
      ingredientCache.current = null;
    };
  }, []);
  const loadIngredients = useCallback(
    (image: GalleryImage, priority: "high" | "low") => {
      const flavor =
        product.variants.find((item) => item.id === image.variantId)?.flavor ??
        "";
      return Promise.allSettled(
        gainerIngredientSources(gainerIngredientKey(flavor)).map((src) =>
          ingredientCache.current?.load(src, priority),
        ),
      );
    },
    [product.variants],
  );
  const warmIngredients = useCallback(
    (image: GalleryImage) => {
      void loadIngredients(image, "low");
    },
    [loadIngredients],
  );
  const prepareIngredients = useCallback(
    async (image: GalleryImage) => {
      // Decorations never hold up shopping on a slow/broken connection. Warm
      // neighbors normally resolve immediately; a cold choice waits at most 180ms.
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        loadIngredients(image, "high"),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 180);
        }),
      ]);
      clearTimeout(timer);
    },
    [loadIngredients],
  );
  const prefix = preview ? "/vista-previa" : "";
  const variantHref = (id: string) =>
    `${prefix}/producto/${product.slug}?variante=${id}`;
  const images = useMemo(
    () =>
      product.variants.flatMap((item) => {
        const photos = variantImages(product, item.id).filter(
          (image) => imageBase || imageUrls[image.path],
        );
        const href = `${prefix}/producto/${product.slug}?variante=${item.id}`;
        return photos.length
          ? photos.map((image) => ({
              id: `${item.id}:${image.id}`,
              variantId: item.id,
              href,
              src: catalogMediaSource(
                imageUrls[image.path] || `${imageBase}/${image.path}`,
                imageBase,
                "detail",
              ),
              alt: image.alt,
            }))
          : [
              {
                id: item.id,
                variantId: item.id,
                href,
                src: "",
                alt: `${product.name} · ${variantLabel(item)}`,
              },
            ];
      }),
    [product, prefix, imageBase, imageUrls],
  );
  const selectImage = useCallback((image: GalleryImage) => {
    if (!image.variantId) return;
    // Gallery commits only after decoding, so pack, price and cart stay in sync.
    setVariantId(image.variantId);
    const url = new URL(window.location.href);
    url.searchParams.set("variante", image.variantId);
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }, []);
  const repeatedFlavor = product.variants.some(
    (item, index, all) =>
      all.findIndex((other) => other.flavor === item.flavor) !== index,
  );
  return (
    <div
      className="product-detail gainer-product-detail"
      ref={root}
      data-variant={variant.id}
    >
      <GainerBackdrop containerRef={root} flavor={variant.flavor} />
      <Link
        href={preview ? "/vista-previa" : "/catalogo"}
        className="text-link gainer-back-link"
      >
        ← Volver a la tienda
      </Link>
      <div className="product-gallery">
        <ProductGallery
          images={images}
          mode="detail"
          transition="turn"
          flavorNavigation
          initialVariantId={variant.id}
          onImageChange={selectImage}
          onPrepareImage={warmIngredients}
          prepareImage={prepareIngredients}
          selectionRequest={selectionRequest}
        />
      </div>
      <RevealGroup
        className="product-detail-copy gainer-product-copy"
        enterOnMount
      >
        <RevealItem>
          <p className="gainer-brand">{brandName}</p>
          <h1>{product.name}</h1>
          {product.description && (
            <p className="product-description">{product.description}</p>
          )}
        </RevealItem>
        <RevealItem direction="none">
          <div
            className="gainer-flavor-picker"
            role="group"
            aria-label="Elegir presentación"
          >
            <p>Sabor</p>
            <div className="gainer-flavor-options">
              {product.variants.map((item) => (
                <a
                  key={item.id}
                  href={variantHref(item.id)}
                  aria-current={item.id === variant.id ? "true" : undefined}
                  aria-label={`${variantLabel(item)}${item.stock === 0 ? " · Sin stock" : ""}`}
                  data-unavailable={item.stock === 0}
                  data-flavor={gainerIngredientKey(item.flavor) ?? "neutral"}
                  onPointerEnter={() =>
                    warmIngredients({
                      id: item.id,
                      variantId: item.id,
                      src: "",
                      alt: "",
                    })
                  }
                  onFocus={() =>
                    warmIngredients({
                      id: item.id,
                      variantId: item.id,
                      src: "",
                      alt: "",
                    })
                  }
                  onClick={(event) => {
                    if (
                      !enhanced ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0
                    )
                      return;
                    event.preventDefault();
                    setSelectionRequest((previous) => ({
                      variantId: item.id,
                      nonce: (previous?.nonce ?? 0) + 1,
                    }));
                  }}
                >
                  <span aria-hidden="true" className="gainer-flavor-dot" />
                  <span>
                    {repeatedFlavor
                      ? variantLabel(item)
                      : item.flavor || variantLabel(item)}
                  </span>
                </a>
              ))}
            </div>
          </div>
          <p
            className="gainer-stock"
            role="status"
            aria-live="polite"
            data-stock={variant.stock > 0 ? "available" : "empty"}
          >
            <span className="gainer-stock-dot" aria-hidden="true" />
            {variant.stock > 0 ? "Disponible" : "Sin stock"}
            {[variant.size, variant.presentation].filter(Boolean).length > 0 &&
              ` · ${[variant.size, variant.presentation].filter(Boolean).join(" · ")}`}
          </p>
        </RevealItem>
        <RevealItem aria-live="polite" aria-atomic="true">
          <ProductPricing variant={variant} animateChange transferFirst />
        </RevealItem>
        <RevealItem className="purchase-action" direction="none">
          <AddToCart
            variantId={variant.id}
            stock={variant.stock}
            slug={product.slug}
          />
        </RevealItem>
        {preview && (
          <p className="purchase-note">
            Vista previa: precios y existencias ficticios. No se realizan
            compras.
          </p>
        )}
      </RevealGroup>
    </div>
  );
}
