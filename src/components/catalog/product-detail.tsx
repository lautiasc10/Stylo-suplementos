"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddToCart } from "@/components/commerce/add-to-cart";
import { ProductPricing } from "@/components/commerce/product-pricing";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { variantLabel } from "@/modules/catalog/model";
import {
  FlavorSceneDecorations,
  sceneFlavor,
  sceneIngredients,
} from "./flavor-scene";
import { productFlavor } from "@/modules/catalog/product-flavor";
import { BrandLogo } from "./brand-logo";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import type { Product } from "@/modules/catalog/model";
import { createGalleryPhotoCache } from "./gallery-photo-cache";
import { galleryPhotos, galleryInformation } from "./gallery-images";
import { ProductGallery, type GalleryImage } from "./product-gallery";
import { ProductInformation } from "./product-information";
import { FlavorHeroGallery } from "./flavor-hero-gallery";
import { FlavorHeroScene } from "./flavor-hero-scene";
import { useFlavorChoreography } from "./use-flavor-choreography";
import { useFlavorDetailsMotion } from "./use-flavor-details-motion";
import { elementPoint } from "./flavor-motion";
export type ProductDetailProps = {
  product: Product;
  brandName: string;
  brandLogo?: string | null;
  category: string;
  selectedId?: string;
  imageBase?: string;
  imageUrls?: Record<string, string>;
  preview?: boolean;
};
const emptyImages: Record<string, string> = {};

/** Shared information layout; flavor scenes use the same variant committed by the gallery. */
export function ProductDetail({
  product,
  brandName,
  brandLogo,
  selectedId,
  imageBase = "",
  imageUrls = emptyImages,
  preview = false,
}: ProductDetailProps) {
  const heroRoot = useRef<HTMLDivElement>(null);
  const preloadGallery = useRef<((id: string) => void) | null>(null);
  const ingredientCache = useRef<ReturnType<
    typeof createGalleryPhotoCache
  > | null>(null);
  const [variantId, setVariantId] = useState(
    selectedId ?? product.variants[0].id,
  );
  const variant =
    product.variants.find((item) => item.id === variantId) ??
    product.variants[0];
  const choreographed =
    product.variants.length > 1 &&
    product.variants.some((item) => productFlavor(item.flavor));
  const selectVariant = useCallback((id: string) => {
    setVariantId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("variante", id);
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }, []);
  const choreography = useFlavorChoreography(
    heroRoot,
    variantId,
    selectVariant,
  );
  useFlavorDetailsMotion(
    heroRoot,
    variantId,
    choreographed,
    choreography.change,
  );
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
      const scene = sceneFlavor(flavor);
      return Promise.allSettled(
        (scene ? sceneIngredients(scene) : []).map((src) =>
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
  const warmVariant = (id: string) => {
    if (choreographed) preloadGallery.current?.(id);
    else warmIngredients({ id, variantId: id, src: "", alt: "" });
  };
  // Preserve both the public route and the local image-review route without JS.
  const variantHref = (id: string) => `?variante=${id}`;
  const images = useMemo(
    () =>
      product.variants.flatMap((item) => {
        const photos = galleryPhotos(product, item.id, imageBase, imageUrls);
        const href = `?variante=${item.id}`;
        return photos.length
          ? photos.map((image) => ({ ...image, href }))
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
    [product, imageBase, imageUrls],
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
  const flavor = productFlavor(variant.flavor);
  const logoSrc =
    brandLogo &&
    catalogMediaSource(
      imageUrls[brandLogo] || (imageBase ? `${imageBase}/${brandLogo}` : ""),
      imageBase,
      "brand",
    );
  const repeatedFlavor = product.variants.some(
    (item, index, all) =>
      all.findIndex((other) => other.flavor === item.flavor) !== index,
  );
  return (
    <div
      ref={heroRoot}
      className={`product-detail gainer-product-detail unified-product-detail${flavor ? " flavor-product-detail" : ""}`}
      data-flavor={flavor ?? undefined}
      data-enhanced={enhanced ? "true" : undefined}
      data-variant={variant.id}
      data-choreography={choreographed || undefined}
      data-flavor-motion={choreography.change?.mode}
      data-flavor-running={choreography.running || undefined}
    >
      {flavor && choreographed ? (
        <FlavorHeroScene
          flavor={sceneFlavor(variant.flavor)}
          previousFlavor={sceneFlavor(
            product.variants.find(
              (item) => item.id === choreography.change?.fromId,
            )?.flavor ?? variant.flavor,
          )}
          change={choreography.change}
        />
      ) : (
        flavor && (
          <FlavorSceneDecorations flavor={sceneFlavor(variant.flavor)} />
        )
      )}
      <Link
        href={preview ? "/vista-previa" : "/catalogo"}
        className="text-link gainer-back-link"
      >
        ← Volver a la tienda
      </Link>
      <div className="product-gallery">
        {choreographed ? (
          <FlavorHeroGallery
            variants={product.variants}
            images={images}
            activeId={variant.id}
            change={choreography.change}
            onRequest={choreography.request}
            onPrepareImage={warmIngredients}
            preload={preloadGallery}
          />
        ) : (
          <ProductGallery
            images={images}
            variants={product.variants}
            mode="detail"
            transition="turn"
            showThumbnails={false}
            flavorNavigation
            initialVariantId={variant.id}
            onImageChange={selectImage}
            onPrepareImage={warmIngredients}
            prepareImage={prepareIngredients}
            selectionRequest={selectionRequest}
            informationImages={galleryInformation(
              product,
              variant.id,
              imageBase,
              imageUrls,
            )}
          />
        )}
      </div>
      <RevealGroup
        className="product-detail-copy gainer-product-copy"
        enterOnMount
      >
        <RevealItem>
          <p className="gainer-brand product-brand">
            {logoSrc ? (
              <BrandLogo src={logoSrc} name={brandName} detail />
            ) : (
              brandName
            )}
          </p>
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
            data-selected-variant={variant.id}
          >
            <p>
              {product.variants.some((item) => productFlavor(item.flavor))
                ? "Sabor"
                : "Presentación"}
            </p>
            <div
              className="gainer-flavor-options"
              onKeyDown={(event) => {
                if (
                  !choreographed ||
                  !["ArrowLeft", "ArrowRight"].includes(event.key)
                )
                  return;
                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const index = product.variants.findIndex(
                  (item) => item.id === variant.id,
                );
                const target =
                  (index + direction + product.variants.length) %
                  product.variants.length;
                const chip =
                  event.currentTarget.querySelectorAll<HTMLAnchorElement>("a")[
                    target
                  ];
                choreography.request(
                  product.variants[target].id,
                  direction,
                  elementPoint(chip),
                );
                chip.focus({ preventScroll: true });
              }}
            >
              {choreographed && (
                <span className="flavor-chip-indicator" aria-hidden="true">
                  <span className="flavor-motion-accent flavor-chip-accent" />
                </span>
              )}
              {product.variants.map((item) => (
                <a
                  key={item.id}
                  className="variant-chip"
                  href={variantHref(item.id)}
                  aria-current={item.id === variant.id ? "true" : undefined}
                  aria-label={`${variantLabel(item)}${item.stock === 0 ? " · Sin stock" : ""}`}
                  data-unavailable={item.stock === 0}
                  data-flavor={productFlavor(item.flavor) ?? "neutral"}
                  onPointerEnter={() => warmVariant(item.id)}
                  onFocus={() => warmVariant(item.id)}
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
                    if (choreographed) {
                      const index = product.variants.findIndex(
                        (entry) => entry.id === variant.id,
                      );
                      const target = product.variants.findIndex(
                        (entry) => entry.id === item.id,
                      );
                      const forward =
                        (target - index + product.variants.length) %
                        product.variants.length;
                      choreography.request(
                        item.id,
                        forward <= product.variants.length / 2 ? 1 : -1,
                        event.detail
                          ? { x: event.clientX, y: event.clientY }
                          : elementPoint(event.currentTarget),
                      );
                      return;
                    }
                    setSelectionRequest((previous) => ({
                      variantId: item.id,
                      nonce: (previous?.nonce ?? 0) + 1,
                    }));
                  }}
                >
                  <span aria-hidden="true" className="gainer-flavor-dot" />
                  <span className="gainer-flavor-name">
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
            <span className={variant.stock === 0 ? "sr-only" : undefined}>
              {variant.stock > 0 ? "Disponible" : "Sin stock"}
            </span>
            {[variant.size, variant.presentation].filter(Boolean).length > 0 &&
              `${variant.stock > 0 ? " · " : ""}${[variant.size, variant.presentation].filter(Boolean).join(" · ")}`}
          </p>
        </RevealItem>
        <RevealItem aria-live="polite" aria-atomic="true">
          <ProductPricing
            variant={variant}
            animateChange={!choreographed}
            transferFirst
          />
        </RevealItem>
        <RevealItem className="purchase-action" direction="none">
          <AddToCart
            variantId={variant.id}
            stock={variant.stock}
            slug={product.slug}
          />
          {choreographed && (
            <span
              className="flavor-motion-accent flavor-button-accent"
              aria-hidden="true"
            />
          )}
        </RevealItem>
        {preview && (
          <p className="purchase-note">
            Vista previa: precios y existencias ficticios. No se realizan
            compras.
          </p>
        )}
      </RevealGroup>
      <ProductInformation
        product={product}
        variantId={variant.id}
        imageBase={imageBase}
        imageUrls={imageUrls}
      />
    </div>
  );
}
