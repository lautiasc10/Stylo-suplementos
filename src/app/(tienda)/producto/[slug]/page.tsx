import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/modules/catalog/server";
import { publicCatalog } from "@/modules/catalog/model";
import { getEnvironment } from "@/lib/config/server";
import { ProductDetail } from "@/components/catalog/product-detail";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    { catalog } = await getCatalog();
  const product = publicCatalog(catalog).products.find(
    (item) => item.slug === slug,
  );
  return product
    ? {
        title: product.seoTitle || product.name,
        description:
          product.seoDescription || product.description.slice(0, 160),
        alternates: { canonical: `/producto/${product.slug}` },
      }
    : { title: "Producto no encontrado" };
}
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variante?: string }>;
}) {
  const { slug } = await params,
    { variante } = await searchParams,
    { catalog, error } = await getCatalog();
  if (error) throw new Error("No pudimos consultar el catálogo.");
  const data = publicCatalog(catalog),
    product = data.products.find((item) => item.slug === slug);
  if (!product) notFound();
  const flavorExperience =
    product.slug === "whey-protein" && product.variants.length > 1;
  const category = data.categories.find((item) =>
      product.categoryIds.includes(item.id),
    ),
    config = getEnvironment().supabase;
  return (
    <section
      className={`container interior-page${flavorExperience ? " flavor-product-page" : ""}`}
    >
      {!flavorExperience && (
        <Link href="/catalogo" className="text-link">
          ← Volver al catálogo
        </Link>
      )}
      <ProductDetail
        key={product.id}
        product={product}
        brandName={
          data.brands.find((item) => item.id === product.brandId)!.name
        }
        brandLogo={
          data.brands.find((item) => item.id === product.brandId)!.logo
        }
        category={category?.slug ?? ""}
        selectedId={variante}
        imageBase={
          config ? `${config.url}/storage/v1/object/public/product-media` : ""
        }
      />
    </section>
  );
}
