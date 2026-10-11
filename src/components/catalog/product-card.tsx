"use client";
import { ProductPricing } from "@/components/commerce/product-pricing";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import { ProductGallery, type GalleryImage } from "./product-gallery";
import {
  variantImages,
  variantLabel,
  type CatalogGroup,
  type Product,
  type Variant,
} from "@/modules/catalog/model";

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
  const href = `${productPrefix}/${product.slug}?variante=${variant.id}`;
  const photos = useMemo(() => {
    const ordered = [...variants].sort(
      (a, b) =>
        Number(b.id === initialVariantId) - Number(a.id === initialVariantId),
    );
    const entries = ordered.flatMap((item) =>
      variantImages(product, item.id)
        .filter((image) => imageBase || imageUrls[image.path])
        .map((image) => ({
          id: `${item.id}:${image.id}`,
          variantId: item.id,
          alt: image.alt,
          src: imageUrls[image.path] || `${imageBase}/${image.path}`,
          href: `${productPrefix}/${product.slug}?variante=${item.id}`,
        })),
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
        <span className="product-card-marker" aria-hidden="true">
          {variant.flavor || variant.size || String(index + 1).padStart(2, "0")}
        </span>
        {photos.length ? (
          <ProductGallery
            images={photos}
            href={href}
            linkLabel={`Ver ${product.name}`}
            startDelay={(index % 5) * 180}
            onImageChange={selectPhoto}
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
          {brand.logo && (imageBase || imageUrls[brand.logo]) && (
            <img
              src={imageUrls[brand.logo] || `${imageBase}/${brand.logo}`}
              alt=""
              width={64}
              height={32}
              loading="lazy"
            />
          )}
          {brand.name}
        </p>
        <h2>
          <Link href={href}>{product.name}</Link>
        </h2>
        <p className="product-card-variant">{variantLabel(variant)}</p>
        <p
          className="stock-badge"
          data-stock={variant.stock > 0 ? "available" : "empty"}
        >
          {variant.stock > 0 ? "Disponible" : "Sin stock"}
        </p>
        <ProductPricing variant={variant} />
        <Link href={href} className="product-card-action">
          Ver variantes <Icon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
