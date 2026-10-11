"use client";
import { useState } from "react";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import {
  formatPrice,
  variantLabel,
  type Product,
} from "@/modules/catalog/model";
export function ProductDetail({
  product,
  brandName,
  category,
  selectedId,
  imageBase = "",
  imageUrls = {},
  preview = false,
}: {
  product: Product;
  brandName: string;
  category: string;
  selectedId?: string;
  imageBase?: string;
  imageUrls?: Record<string, string>;
  preview?: boolean;
}) {
  const [variantId, setVariantId] = useState(
      selectedId ?? product.variants[0].id,
    ),
    [photoId, setPhotoId] = useState("");
  const variant =
    product.variants.find((item) => item.id === variantId) ??
    product.variants[0];
  const specific = product.images.filter(
    (image) => image.variantId === variant.id,
  );
  const images = (
    specific.length
      ? specific
      : product.images.filter((image) => image.variantId === null)
  ).sort((a, b) => a.position - b.position);
  const photo = images.find((image) => image.id === photoId) ?? images[0];
  return (
    <div className="product-detail">
      <div className="product-gallery">
        <div className="product-detail-media">
          {photo && (imageBase || imageUrls[photo.path]) ? (
            <img
              src={imageUrls[photo.path] || `${imageBase}/${photo.path}`}
              alt={photo.alt}
              width={720}
              height={720}
              decoding="async"
            />
          ) : (
            <>
              <CategoryIllustration kind={category} />
              <p>
                {preview
                  ? "Ilustración de categoría · producto de prueba"
                  : "Imagen del producto pendiente"}
              </p>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="product-thumbnails" aria-label="Galería del producto">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Ver ${image.alt}`}
                aria-pressed={photo?.id === image.id}
                onClick={() => setPhotoId(image.id)}
              >
                <img
                  src={imageUrls[image.path] || `${imageBase}/${image.path}`}
                  alt=""
                  width={80}
                  height={80}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-detail-copy">
        <p className="eyebrow">{brandName}</p>
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
              setPhotoId("");
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
          <dl className="product-prices">
            <div>
              <dt>Precio de lista</dt>
              <dd>{formatPrice(variant.listPrice)}</dd>
            </div>
            <div>
              <dt>Efectivo / transferencia</dt>
              <dd>{formatPrice(variant.cashPrice)}</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd className="product-sku">{variant.sku}</dd>
            </div>
          </dl>
        </div>
        <p className="purchase-note">
          {preview
            ? "Vista previa: precios y existencias ficticios. No se realizan compras."
            : "La compra online estará disponible próximamente."}
        </p>
        <button className="button button-gold" disabled>
          {variant.stock === 0 ? "Sin stock" : "Compra próximamente"}
        </button>
      </div>
    </div>
  );
}
