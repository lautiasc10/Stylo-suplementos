"use client";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { ProductPricing } from "@/components/commerce/product-pricing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CategoryIllustration } from "@/components/storefront/category-illustration";
import { galleryPhotos, galleryInformation } from "./gallery-images";
import { ProductGallery, type GalleryImage } from "./product-gallery";
import {
  FlavorSceneDecorations,
  sceneFlavor,
  sceneIngredient,
} from "./flavor-scene";
import { AddToCart } from "@/components/commerce/add-to-cart";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Crossfade } from "@/components/ui/Crossfade";
import { GainerProductDetail } from "./gainer-product-detail";
import { ProductInformation } from "./product-information";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import { variantLabel, type Product } from "@/modules/catalog/model";
const emptyImageUrls: Record<string, string> = {};
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

export function ProductDetail(props: ProductDetailProps) {
  return props.category === "ganadores-de-masa" ? (
    <GainerProductDetail {...props} />
  ) : (
    <StandardProductDetail {...props} />
  );
}

function StandardProductDetail({
  product,
  brandName,
  brandLogo,
  category,
  selectedId,
  imageBase = "",
  imageUrls = emptyImageUrls,
  preview = false,
}: ProductDetailProps) {
  const [variantId, setVariantId] = useState(
    selectedId ?? product.variants[0].id,
  );
  const variant =
    product.variants.find((item) => item.id === variantId) ??
    product.variants[0];
  const flavorExperiment =
    product.slug === "whey-protein" && product.variants.length > 1;
  const variantGallery = product.variants.length > 1;
  const [selectionRequest, setSelectionRequest] = useState<{
    variantId: string;
    nonce: number;
  } | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const preparedIngredients = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => setEnhanced(true), []);
  useEffect(() => {
    if (
      !flavorExperiment ||
      preview ||
      window.scrollY > 1 ||
      window.location.hash
    )
      return;
    const categories = document.querySelector(".category-navigation");
    if (categories)
      window.scrollTo({
        top: categories.getBoundingClientRect().top + window.scrollY,
        behavior: "instant",
      });
  }, [flavorExperiment, preview]);
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
      ingredient.fetchPriority = "low";
      ingredient.decoding = "async";
      ingredient.src = sceneIngredient(flavor);
      preparedIngredients.current.set(flavor, ingredient);
    },
    [product],
  );
  const flavorImages = useMemo(() => {
    if (!variantGallery) return [];
    const order = { banana: 0, frutilla: 1, vainilla: 2 };
    const flavorOrder = (value: string) => {
      const match = sceneFlavor(value);
      return match ? order[match] : 3;
    };
    return [...product.variants]
      .sort((a, b) => flavorOrder(a.flavor) - flavorOrder(b.flavor))
      .flatMap((item) => {
        const photos = galleryPhotos(product, item.id, imageBase, imageUrls);
        const href = `${preview ? "/vista-previa" : ""}/producto/${product.slug}?variante=${item.id}`;
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
      });
  }, [variantGallery, product, imageBase, imageUrls, preview]);
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
  const images = galleryPhotos(product, variant.id, imageBase, imageUrls);
  const informationImages = galleryInformation(
    product,
    variant.id,
    imageBase,
    imageUrls,
  );
  const logoSrc =
    brandLogo &&
    catalogMediaSource(
      imageUrls[brandLogo] || (imageBase ? `${imageBase}/${brandLogo}` : ""),
      imageBase,
      "brand",
    );
  return (
    <div
      className={`product-detail${flavorExperiment ? " flavor-product-detail" : ""}`}
      data-flavor={flavorExperiment ? (flavor ?? "neutral") : undefined}
      data-enhanced={enhanced ? "true" : undefined}
    >
      {flavorExperiment && !preview && (
        <Link href="/catalogo" className="text-link flavor-back-link">
          ← Volver al catálogo
        </Link>
      )}
      {flavorExperiment && <FlavorSceneDecorations flavor={flavor} />}
      <div className="product-gallery">
        {variantGallery ? (
          <>
            {flavorExperiment && (
              <p className="flavor-scene-heading">Encontrá tu sabor</p>
            )}
            <ProductGallery
              images={flavorImages}
              mode="detail"
              transition={product.turnImages?.length ? "turn" : "fade"}
              informationImages={informationImages}
              flavorNavigation
              initialVariantId={variant.id}
              onImageChange={selectFlavorImage}
              onPrepareImage={flavorExperiment ? prepareFlavorImage : undefined}
              selectionRequest={selectionRequest}
            />
          </>
        ) : images.length ? (
          <Crossfade valueKey={variant.id} className="pack-crossfade">
            <ProductGallery
              key={`${variant.id}:${images.map((image) => image.id).join(":")}`}
              images={images}
              informationImages={informationImages}
              mode="detail"
              transition="fade"
            />
          </Crossfade>
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
      <RevealGroup className="product-detail-copy" enterOnMount>
        <RevealItem as="p" className="eyebrow product-brand">
          {logoSrc ? (
            <BrandLogo src={logoSrc} name={brandName} detail />
          ) : (
            brandName
          )}
        </RevealItem>
        <RevealItem>
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
        </RevealItem>
        <RevealItem>
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
                  if (variantGallery)
                    setSelectionRequest({
                      variantId: event.target.value,
                      nonce: Date.now(),
                    });
                  else setVariantId(event.target.value);
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
        </RevealItem>
        <RevealItem aria-live="polite" aria-atomic="true">
          {!(flavorExperiment && enhanced) && (
            <p
              className="stock-badge"
              data-stock={variant.stock > 0 ? "available" : "empty"}
            >
              {variant.stock > 0 ? "Disponible" : "Sin stock"}
            </p>
          )}
          <ProductPricing variant={variant} animateChange />
        </RevealItem>
        {(preview || !flavorExperiment) && (
          <p className="purchase-note">
            {preview
              ? "Vista previa: precios y existencias ficticios. No se realizan compras."
              : "La compra online estará disponible próximamente."}
          </p>
        )}
        <RevealItem className="purchase-action">
          <AddToCart
            variantId={variant.id}
            stock={variant.stock}
            slug={product.slug}
            illustrated={flavorExperiment}
          />
        </RevealItem>
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
