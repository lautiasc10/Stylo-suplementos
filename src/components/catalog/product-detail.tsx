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
      className={`product-detail gainer-product-detail unified-product-detail${flavor ? " flavor-product-detail" : ""}`}
      data-flavor={flavor ?? undefined}
      data-enhanced={enhanced ? "true" : undefined}
      data-variant={variant.id}
    >
      {flavor && (
        <FlavorSceneDecorations flavor={sceneFlavor(variant.flavor)} />
      )}
      <Link
        href={preview ? "/vista-previa" : "/catalogo"}
        className="text-link gainer-back-link"
      >
        ← Volver a la tienda
      </Link>
      <div className="product-gallery">
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
            <div className="gainer-flavor-options">
              {product.variants.map((item) => (
                <a
                  key={item.id}
                  className="variant-chip"
                  href={variantHref(item.id)}
                  aria-current={item.id === variant.id ? "true" : undefined}
                  aria-label={`${variantLabel(item)}${item.stock === 0 ? " · Sin stock" : ""}`}
                  data-unavailable={item.stock === 0}
                  data-flavor={productFlavor(item.flavor) ?? "neutral"}
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
      <ProductInformation
        product={product}
        variantId={variant.id}
        imageBase={imageBase}
        imageUrls={imageUrls}
      />
    </div>
  );
}
