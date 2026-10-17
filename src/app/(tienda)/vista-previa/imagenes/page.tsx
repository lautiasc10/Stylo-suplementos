import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import trial from "@/modules/catalog/normalization-trial.json";
import type { Catalog } from "@/modules/catalog/model";

export default async function ImageTrialPage({
  searchParams,
}: {
  searchParams: Promise<{ originales?: string }>;
}) {
  const original = (await searchParams).originales === "1";
  const catalog = trial.catalog as Catalog;
  return (
    <div
      className={`image-normalization-trial ${original ? "image-normalization-trial--before" : "image-normalization-trial--after"}`}
    >
      <p className="eyebrow">Fase 1 · Prueba local</p>
      <h1>Imágenes parejas · 5 productos</h1>
      <p className="image-trial-intro">
        Comparación con las fotos originales. Esta prueba no modifica el
        catálogo ni las imágenes de la tienda.
      </p>
      <nav className="image-trial-toggle" aria-label="Comparar imágenes">
        <Link
          href="/vista-previa/imagenes?originales=1"
          className="button button-outline"
          aria-current={original ? "page" : undefined}
        >
          Antes · Originales
        </Link>
        <Link
          href="/vista-previa/imagenes"
          className="button button-outline"
          aria-current={!original ? "page" : undefined}
        >
          Después · Normalizadas
        </Link>
      </nav>
      <div className="product-grid image-trial-grid">
        {catalog.products.map((product, index) => (
          <ProductCard
            key={`${original}:${product.id}`}
            product={product}
            variants={product.variants}
            initialVariantId={product.variants[0].id}
            brand={catalog.brands.find((b) => b.id === product.brandId)!}
            category={catalog.categories.find((c) =>
              product.categoryIds.includes(c.id),
            )}
            index={index}
            productPrefix="/vista-previa/imagenes/producto"
            imageBase={trial.imageBase}
            imageUrls={
              original
                ? trial.beforeUrls
                : { ...trial.beforeUrls, ...trial.normalizedUrls }
            }
            preview
          />
        ))}
      </div>
      <details className="image-trial-review">
        <summary>Imágenes para revisar a mano ({trial.review.length})</summary>
        <p>
          Las 18 fotos ya tenían transparencia real. No se detectaron fondos de
          roca dentro de estos archivos; los avisos siguientes corresponden a
          originales de baja resolución.
        </p>
        <ul>
          {trial.review.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>
              <p>{item.warnings.join(" ")}</p>
            </li>
          ))}
        </ul>
        <a
          href="/media/normalization-trial-v1/report.json"
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
        >
          Ver informe completo ↗
        </a>
      </details>
    </div>
  );
}
