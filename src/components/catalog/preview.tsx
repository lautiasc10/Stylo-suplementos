"use client";
import { useEffect, useState } from "react";
import { demoCatalog } from "@/modules/catalog/demo";
import {
  validateCatalog,
  publicCatalog,
  type Catalog,
  type CatalogFilters,
} from "@/modules/catalog/model";
import { inspectImage } from "@/modules/catalog/image";
import {
  validatePromotions,
  type Promotion,
} from "@/modules/commerce/promotions";
import { CatalogListing } from "./listing";
import { ProductDetail } from "./product-detail";
import { CatalogManager } from "./manager";
import { CinematicHero } from "@/components/storefront/cinematic-hero";
import { ReferenceGoals } from "@/components/storefront/reference-goals";
import { ScrollBestSellers } from "@/components/storefront/scroll-best-sellers";
import { CustomComboBuilder } from "@/components/storefront/custom-combo-builder";
import { bestSellerExamples } from "@/modules/catalog/best-seller-examples";
import { comboOptions } from "@/modules/catalog/combo-options";
import { WhyStylo } from "@/components/storefront/why-stylo";
import { BrandMarquee } from "@/components/storefront/brand-marquee";
import { AthleteCall } from "@/components/storefront/athlete-call";
import { homeStoryData } from "@/components/storefront/home-story-data";
import { HomeProducts } from "@/components/storefront/home-products";
import { heroDisplay, heroBody } from "@/components/storefront/hero-fonts";
const storageKey = "stylo.catalog-preview.v1";
type PreviewState = { catalog: Catalog; images: Record<string, string> };
export function CatalogPreview({
  mode,
  filters = {},
  slug,
  selectedId,
}: {
  mode: "catalog" | "manage" | "product" | "reference";
  filters?: CatalogFilters;
  slug?: string;
  selectedId?: string;
}) {
  const [state, setState] = useState<PreviewState | null>(null),
    [notice, setNotice] = useState("");
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  useEffect(() => {
    const sync = () => {
      try {
        const source = localStorage.getItem("stylo.promotions-preview.v1");
        const data = source ? JSON.parse(source) : null;
        setPromotions(
          data && !validatePromotions(data.promotions).length
            ? data.promotions
            : [],
        );
      } catch {
        setPromotions([]);
      }
    };
    sync();
    window.addEventListener("stylo-preview-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("stylo-preview-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    try {
      const source = localStorage.getItem(storageKey);
      if (source) {
        const saved = JSON.parse(source) as PreviewState;
        if (
          !validateCatalog(saved.catalog).length &&
          saved.images &&
          Object.values(saved.images).every((value) =>
            /^data:image\/(jpeg|png|webp);base64,/.test(value),
          )
        ) {
          setState(saved);
          return;
        }
      }
    } catch {
      setNotice(
        "No pudimos recuperar los cambios locales; se muestran los datos iniciales.",
      );
    }
    setState({ catalog: demoCatalog(), images: {} });
  }, []);
  function store(next: PreviewState) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event("stylo-preview-change"));
      setState(next);
      return {};
    } catch {
      return {
        error:
          "El navegador no pudo guardar los cambios. Puede que el espacio local esté lleno; quitá imágenes pesadas o habilitá almacenamiento.",
      };
    }
  }
  if (!state) return <p role="status">Preparando vista previa…</p>;
  const data = publicCatalog(state.catalog),
    product = data.products.find((item) => item.slug === slug);
  const story = mode === "reference" ? homeStoryData(data, "", state.images) : null;
  return (
    <>
      <p className="preview-notice">
        Vista previa local · Productos, marcas, precios y existencias de prueba.
        Los cambios se guardan en este navegador y no modifican la tienda.
      </p>
      {notice && <p role="status">{notice}</p>}
      {mode === "reference" && (
        <div
          className={`reference-landing ${heroDisplay.variable} ${heroBody.variable}`}
        >
          <CinematicHero composition="reference" />
          <ScrollBestSellers products={bestSellerExamples(data, "", promotions, state.images, "/vista-previa")} />
          <ReferenceGoals />
          <HomeProducts id="destacados" title="Productos destacados" eyebrow="LA SELECCIÓN STYLO" products={data.products.filter((item) => item.featured)} catalog={data} imageBase="" imageUrls={state.images} preview />
          <HomeProducts id="novedades" title="Novedades" eyebrow="SELECCIÓN DE EJEMPLO · STYLO" products={data.products.slice(-4)} catalog={data} imageBase="" imageUrls={state.images} preview />
          <CustomComboBuilder categories={comboOptions(data, "", state.images)} />
          {story && <WhyStylo stats={story.stats} />}
          {story && <BrandMarquee brands={story.brands} catalogHref="/vista-previa" />}
          <AthleteCall />
        </div>
      )}
      {mode === "catalog" && (
        <CatalogListing
          catalog={data}
          filters={filters}
          action="/vista-previa"
          productPrefix="/vista-previa/producto"
          preview
          promotions={promotions}
          imageUrls={state.images}
        />
      )}
      {mode === "product" &&
        (product ? (
          <ProductDetail
            product={product}
            brandName={
              data.brands.find((item) => item.id === product.brandId)!.name
            }
            brandLogo={
              data.brands.find((item) => item.id === product.brandId)!.logo
            }
            category={
              (
                data.categories.find(
                  (item) =>
                    item.slug === "ganadores-de-masa" &&
                    product.categoryIds.includes(item.id),
                ) ??
                data.categories.find((item) =>
                  product.categoryIds.includes(item.id),
                )
              )?.slug ?? ""
            }
            selectedId={selectedId}
            imageUrls={state.images}
            preview
          />
        ) : (
          <div className="empty-state">
            <h2>Producto oculto o no encontrado.</h2>
            <p>Volvé al catálogo o revisá su estado en gestión.</p>
          </div>
        ))}
      {mode === "manage" && (
        <CatalogManager
          catalog={state.catalog}
          imageUrls={state.images}
          commit={async (catalog) =>
            store({
              images: state.images,
              catalog: { ...catalog, revision: state.catalog.revision + 1 },
            })
          }
          upload={async (file, productId) => {
            try {
              const { extension } = await inspectImage(file);
              const path = `${productId}/${crypto.randomUUID()}.${extension}`;
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () =>
                  reject(new Error("No pudimos leer la imagen."));
                reader.readAsDataURL(file);
              });
              const latestSource = localStorage.getItem(storageKey),
                latest = latestSource
                  ? (JSON.parse(latestSource) as PreviewState)
                  : state;
              const result = store({
                ...latest,
                images: { ...latest.images, [path]: dataUrl },
              });
              return result.error ? result : { path };
            } catch (error) {
              return {
                error:
                  error instanceof Error
                    ? error.message
                    : "No pudimos cargar la imagen.",
              };
            }
          }}
        />
      )}
      <button
        type="button"
        className="text-link preview-reset"
        onClick={() => {
          const result = store({ catalog: demoCatalog(), images: {} });
          if (result.error) setNotice(result.error);
        }}
      >
        Restablecer datos de prueba
      </button>
    </>
  );
}
