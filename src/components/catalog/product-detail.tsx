"use client";
import { BrandLogo } from "./brand-logo";
import { ProductPricing } from "@/components/commerce/product-pricing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import { ProductGallery, type GalleryImage } from "./product-gallery";
import {
  FlavorSceneDecorations,
  sceneFlavor,
  sceneIngredient,
} from "./flavor-scene";
import { AddToCart } from "@/components/commerce/add-to-cart";
import {
  variantLabel,
  variantImages,
  type Product,
} from "@/modules/catalog/model";
const emptyImageUrls: Record<string, string> = {};
export function ProductDetail({
  product,
  brandName,
  brandLogo,
  category,
  selectedId,
  imageBase = "",
  imageUrls = emptyImageUrls,
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
  const flavorExperiment =
    product.slug === "whey-protein" && product.variants.length > 1;
  const [enhanced, setEnhanced] = useState(false);
  const [backgroundPaused, setBackgroundPaused] = useState(false);
  const preparedIngredients = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => setEnhanced(true), []);
  const flavor = sceneFlavor(variant.flavor);
  const [titleLead, ...titleRest] = product.name.split(" ");
  const prepareFlavorImage = useCallback(
    (image: GalleryImage) => {
      const item = product.variants.find(
        (variant) => variant.id === image.variantId,
      );
      const flavor = item && sceneFlavor(item.flavor);
      if (!flavor || preparedIngredients.current.has(flavor)) return;
      const ingredient = new Image();
      ingredient.decoding = "async";
      ingredient.src = sceneIngredient(flavor);
      preparedIngredients.current.set(flavor, ingredient);
    },
    [product],
  );
  const flavorImages = useMemo(() => {
    if (!flavorExperiment) return [];
    const order = { banana: 0, frutilla: 1, vainilla: 2 };
    const flavorOrder = (value: string) => {
      const match = sceneFlavor(value);
      return match ? order[match] : 3;
    };
    return [...product.variants]
      .sort((a, b) => flavorOrder(a.flavor) - flavorOrder(b.flavor))
      .flatMap((item) => {
        const photos = variantImages(product, item.id).filter(
          (image) => imageBase || imageUrls[image.path],
        );
        const href = `${preview ? "/vista-previa" : ""}/producto/${product.slug}?variante=${item.id}`;
        return photos.length
          ? photos.map((image) => ({
              id: `${item.id}:${image.id}`,
              variantId: item.id,
              href,
              src: imageUrls[image.path] || `${imageBase}/${image.path}`,
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
      });
  }, [flavorExperiment, product, imageBase, imageUrls, preview]);
  const selectFlavorImage = useCallback((image: GalleryImage) => {
    if (!image.variantId) return;
    setVariantId(image.variantId);
    const url = new URL(window.location.href);
    url.searchParams.set("variante", image.variantId);
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }, []);
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
  return (
    <div
      className={`product-detail${flavorExperiment ? " flavor-product-detail" : ""}`}
      data-flavor={flavorExperiment ? (flavor ?? "neutral") : undefined}
      data-enhanced={enhanced ? "true" : undefined}
    >
      {flavorExperiment && (
        <FlavorSceneDecorations flavor={flavor} paused={backgroundPaused} />
      )}
      <div className="product-gallery">
        {flavorExperiment ? (
          <>
            <p className="flavor-scene-heading">Encontrá tu sabor</p>
            <ProductGallery
              images={flavorImages}
              mode="detail"
              transition="turn"
              flavorNavigation
              initialVariantId={variant.id}
              onImageChange={selectFlavorImage}
              onPrepareImage={prepareFlavorImage}
            />
            {enhanced && (
              <button
                type="button"
                className="flavor-motion-toggle"
                aria-label={
                  backgroundPaused
                    ? "Reanudar animación del fondo"
                    : "Pausar animación del fondo"
                }
                onClick={() => setBackgroundPaused((value) => !value)}
              >
                <Icon name={backgroundPaused ? "play" : "pause"} />
                <span>
                  {backgroundPaused ? "Reanudar fondo" : "Pausar fondo"}
                </span>
              </button>
            )}
          </>
        ) : images.length ? (
          <ProductGallery
            key={`${variant.id}:${images.map((image) => image.id).join(":")}`}
            images={images}
            mode="detail"
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
        <h1>
          {flavorExperiment ? (
            <>
              <strong>{titleLead}</strong>
              {titleRest.length > 0 && ` ${titleRest.join(" ")}`}
            </>
          ) : (
            product.name
          )}
        </h1>
        <p className="product-description">{product.description}</p>
        {flavorExperiment && enhanced ? (
          <div className="flavor-selected" role="status" aria-live="polite">
            <span>Sabor elegido</span>
            <div className="flavor-selected-row">
              <div>
                <strong>{variant.flavor || "Presentación"}</strong>
                <p>
                  {[variant.size, variant.presentation]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span
                className="stock-badge"
                data-stock={variant.stock > 0 ? "available" : "empty"}
              >
                {variant.stock > 0 ? "Disponible" : "Sin stock"}
              </span>
            </div>
          </div>
        ) : (
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
              <button className="button button-outline">
                Ver presentación
              </button>
            </noscript>
          </form>
        )}
        <div aria-live="polite" aria-atomic="true">
          {!(flavorExperiment && enhanced) && (
            <p
              className="stock-badge"
              data-stock={variant.stock > 0 ? "available" : "empty"}
            >
              {variant.stock > 0 ? "Disponible" : "Sin stock"}
            </p>
          )}
          <ProductPricing variant={variant} />
        </div>
        {(preview || !flavorExperiment) && (
          <p className="purchase-note">
            {preview
              ? "Vista previa: precios y existencias ficticios. No se realizan compras."
              : "La compra online estará disponible próximamente."}
          </p>
        )}
        <AddToCart
          variantId={variant.id}
          stock={variant.stock}
          slug={product.slug}
          illustrated={flavorExperiment}
        />
      </div>
    </div>
  );
}
