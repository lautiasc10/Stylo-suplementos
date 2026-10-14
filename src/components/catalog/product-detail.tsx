"use client";
import { BrandLogo } from "./brand-logo";
import { ProductPricing } from "@/components/commerce/product-pricing";
import { useState } from "react";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import { ProductGallery } from "./product-gallery";
import { useFlavorIngredients } from "./flavor-ingredients";
import { AddToCart } from "@/components/commerce/add-to-cart";
import {
  variantLabel,
  variantImages,
  type Product,
} from "@/modules/catalog/model";
export function ProductDetail({
  product,
  brandName,
  brandLogo,
  category,
  selectedId,
  imageBase = "",
  imageUrls = {},
  preview = false,
}: {
  product: Product;
  brandName: string;
  brandLogo?: string | null;
  category: string;
  selectedId?: string;
  imageBase?: string;
  imageUrls?: Record<string, string>;
  preview?: boolean;
}) {
  const [variantId, setVariantId] = useState(
    selectedId ?? product.variants[0].id,
  );
  const variant =
    product.variants.find((item) => item.id === variantId) ??
    product.variants[0];
  const images = variantImages(product, variant.id)
    .filter((image) => imageBase || imageUrls[image.path])
    .map((image) => ({
      id: image.id,
      alt: image.alt,
      src: imageUrls[image.path] || `${imageBase}/${image.path}`,
    }));
  const logoSrc =
    brandLogo &&
    (imageUrls[brandLogo] || (imageBase ? `${imageBase}/${brandLogo}` : ""));
  const ingredients = useFlavorIngredients(
    images.length ? variant.flavor : undefined,
  );
  return (
    <div className="product-detail">
      <div className="product-gallery">
        {images.length ? (
          <ProductGallery
            key={`${variant.id}:${images.map((image) => image.id).join(":")}`}
            images={images}
            mode="detail"
            ingredients={ingredients}
          />
        ) : (
          <div className="product-detail-media">
            <>
              <CategoryIllustration kind={category} />
              <p>
                {preview
                  ? "Ilustración de categoría · producto de prueba"
                  : "Imagen del producto pendiente"}
              </p>
            </>
          </div>
        )}
      </div>
      <div className="product-detail-copy">
        <p className="eyebrow product-brand">
          {logoSrc ? (
            <BrandLogo src={logoSrc} name={brandName} detail />
          ) : (
            brandName
          )}
        </p>
        <h1>{product.name}</h1>
        <p className="product-description">{product.description}</p>
        <form method="get" className="variant-picker">
          <label htmlFor="product-variant">Elegí tu presentación</label>
          <select
            name="variante"
            id="product-variant"
            value={variant.id}
            onChange={(event) => {
              setVariantId(event.target.value);
            }}
            aria-label="Presentación"
          >
            {product.variants.map((item) => (
              <option key={item.id} value={item.id}>
                {variantLabel(item)}
                {item.stock === 0 ? " · Sin stock" : ""}
              </option>
            ))}
          </select>
          <noscript>
            <button className="button button-outline">Ver presentación</button>
          </noscript>
        </form>
        <div aria-live="polite" aria-atomic="true">
          <p
            className="stock-badge"
            data-stock={variant.stock > 0 ? "available" : "empty"}
          >
            {variant.stock > 0 ? "Disponible" : "Sin stock"}
          </p>
          <ProductPricing variant={variant} />
        </div>
        <p className="purchase-note">
          {preview
            ? "Vista previa: precios y existencias ficticios. No se realizan compras."
            : "La compra online estará disponible próximamente."}
        </p>
        <AddToCart
          variantId={variant.id}
          stock={variant.stock}
          slug={product.slug}
        />
      </div>
    </div>
  );
}
