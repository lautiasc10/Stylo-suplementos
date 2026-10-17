import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/catalog/product-detail";
import type { Catalog } from "@/modules/catalog/model";
import trial from "@/modules/catalog/normalization-trial.json";

export default async function ImageTrialProduct({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ originales?: string; variante?: string }>;
}) {
  const { slug } = await params;
  const { originales, variante } = await searchParams;
  const original = originales === "1";
  const catalog = trial.catalog as Catalog;
  const product = catalog.products.find((p) => p.slug === slug);
  if (!product) notFound();
  const brand = catalog.brands.find((b) => b.id === product.brandId)!;
  const url = `/vista-previa/imagenes/producto/${product.slug}`;
  const variant =
    product.variants.find((v) => v.id === variante)?.id ??
    product.variants[0].id;
  return (
    <div
      className={`image-normalization-trial ${original ? "image-normalization-trial--before" : "image-normalization-trial--after"}`}
    >
      <Link href="/vista-previa/imagenes" className="text-link">
        ← Volver a los 5 productos
      </Link>
      <nav className="image-trial-toggle" aria-label="Comparar imágenes">
        <Link
          href={`${url}?originales=1&variante=${variant}`}
          className="button button-outline"
          aria-current={original ? "page" : undefined}
        >
          Antes · Originales
        </Link>
        <Link
          href={`${url}?variante=${variant}`}
          className="button button-outline"
          aria-current={!original ? "page" : undefined}
        >
          Después · Normalizadas
        </Link>
      </nav>
      <ProductDetail
        key={`${product.id}:${original}`}
        product={product}
        brandName={brand.name}
        brandLogo={brand.logo}
        category={
          catalog.categories.find((c) => product.categoryIds.includes(c.id))
            ?.slug ?? ""
        }
        selectedId={variant}
        imageBase={trial.imageBase}
        imageUrls={
          original
            ? trial.beforeUrls
            : { ...trial.beforeUrls, ...trial.normalizedUrls }
        }
        preview
      />
    </div>
  );
}
