"use client";
import {
  ProductPricing,
  ProductPromotionBadge,
} from "@/components/commerce/product-pricing";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import { ProductGallery, type GalleryImage } from "./product-gallery";
import { galleryPhotos } from "./gallery-images";
import { BrandLogo } from "./brand-logo";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import {
  type CatalogGroup,
  type Product,
  type Variant,
} from "@/modules/catalog/model";

function FlavorBadge({ flavor }: { flavor: string }) {
  const [visual, setVisual] = useState({
    current: flavor,
    previous: "",
    sequence: 0,
  });

  useEffect(() => {
    setVisual((state) =>
      state.current === flavor
        ? state
        : {
            current: flavor,
            previous: state.current,
            sequence: state.sequence + 1,
          },
    );
  }, [flavor]);

  useEffect(() => {
    if (!visual.previous) return;
    const timer = window.setTimeout(() => {
      setVisual((state) =>
        state.sequence === visual.sequence ? { ...state, previous: "" } : state,
      );
    }, 480);
    return () => window.clearTimeout(timer);
  }, [visual.previous, visual.sequence]);

  if (!visual.current) return null;
  return (
    <span
      className="product-card-marker"
      data-previous={visual.previous || undefined}
    >
      <span
        key={visual.sequence}
        className="product-card-marker-current"
        data-changing={visual.sequence > 0 ? "true" : undefined}
      >
        {visual.current}
      </span>
    </span>
  );
}

export function ProductCard({
  product,
  variants,
  initialVariantId,
  brand,
  category,
  index,
  productPrefix,
  imageBase,
  imageUrls,
  preview,
}: {
  product: Product;
  variants: Variant[];
  initialVariantId: string;
  brand: CatalogGroup;
  category?: CatalogGroup;
  index: number;
  productPrefix: string;
  imageBase: string;
  imageUrls: Record<string, string>;
  preview: boolean;
}) {
  const [variantId, setVariantId] = useState(initialVariantId);
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  const differentFlavors =
    new Set(
      product.variants
        .filter((item) => item.active)
        .map((item) => item.flavor.trim().toLocaleLowerCase())
        .filter(Boolean),
    ).size > 1;
  const brandLogo =
    brand.logo &&
    catalogMediaSource(
      imageUrls[brand.logo] || (imageBase ? `${imageBase}/${brand.logo}` : ""),
      imageBase,
      "brand",
    );
  const href = `${productPrefix}/${product.slug}?variante=${variant.id}`;
  const photos = useMemo(() => {
    const ordered = [...variants].sort(
      (a, b) =>
        Number(b.id === initialVariantId) - Number(a.id === initialVariantId),
    );
    const entries = ordered.flatMap((item) =>
      galleryPhotos(product, item.id, imageBase, imageUrls, "card").map(
        (image) => ({
          ...image,
          href: `${productPrefix}/${product.slug}?variante=${item.id}`,
        }),
      ),
    );
    // A missing initial photo must not show a different SKU with the initial price.
    return entries[0]?.variantId === initialVariantId ? entries : [];
  }, [
    product,
    variants,
    initialVariantId,
    imageBase,
    imageUrls,
    productPrefix,
  ]);
  const selectPhoto = useCallback((image: GalleryImage) => {
    if (image.variantId) setVariantId(image.variantId);
  }, []);

  return (
    <article className="product-card">
      <div className="product-card-media">
        <div className="product-card-labels">
          <ProductPromotionBadge key={variant.id} variant={variant} />
          {variant.flavor && <FlavorBadge flavor={variant.flavor} />}
          {variant.stock === 0 && (
            <span key={variant.id} className="stock-badge" data-stock="empty">
              Sin stock
            </span>
          )}
        </div>
        {photos.length ? (
          <ProductGallery
            images={photos}
            href={href}
            linkLabel={`Ver ${product.name}`}
            startDelay={(index % 5) * 180}
            onImageChange={selectPhoto}
            transition={differentFlavors ? "turn" : "fragments"}
          />
        ) : (
          <Link
            href={href}
            aria-label={`Ver ${product.name}`}
            className="product-placeholder"
          >
            <CategoryIllustration kind={category?.slug ?? "proteinas"} />
            <span>
              {preview ? "Ilustración · datos de prueba" : "Imagen pendiente"}
            </span>
          </Link>
        )}
      </div>
      <div className="product-card-copy">
        <p className="product-brand">
          {brandLogo ? (
            <BrandLogo src={brandLogo} name={brand.name} />
          ) : (
            brand.name
          )}
        </p>
        <h2>
          <Link href={href}>{product.name}</Link>
        </h2>
        <ProductPricing variant={variant} compact />
        <Link href={href} className="product-card-action">
          Ver variantes <Icon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
