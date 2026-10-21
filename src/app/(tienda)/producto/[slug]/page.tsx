import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/modules/catalog/server";
import { publicCatalog } from "@/modules/catalog/model";
import { getEnvironment } from "@/lib/config/server";
import { ProductDetail } from "@/components/catalog/product-detail";
import { StructuredData } from "@/components/seo/structured-data";
import { productMetadata, productStructuredData } from "@/modules/seo/product";
import { readPromotions } from "@/modules/commerce/promotions-server";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variante?: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    { variante } = await searchParams,
    { catalog } = await getCatalog();
  const config = getEnvironment();
  return productMetadata({
    catalog,
    slug,
    selectedId: variante,
    siteUrl: config.siteUrl,
    imageBase: config.supabase
      ? `${config.supabase.url}/storage/v1/object/public/product-media`
      : "",
  });
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
  const category =
      data.categories.find(
        (item) =>
          item.slug === "ganadores-de-masa" &&
          product.categoryIds.includes(item.id),
      ) ??
      data.categories.find((item) => product.categoryIds.includes(item.id)),
    config = getEnvironment();
  const imageBase = config.supabase
    ? `${config.supabase.url}/storage/v1/object/public/product-media`
    : "";
  const promotions = await readPromotions();
  return (
    <section className="container interior-page product-flavor-page">
      <StructuredData
        value={productStructuredData({
          catalog: data,
          slug,
          promotions: promotions.error ? [] : promotions.state.promotions,
          siteUrl: config.siteUrl,
          imageBase,
        })}
      />
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
        selectedId={product.variants.find((item) => item.id === variante)?.id}
        imageBase={imageBase}
      />
    </section>
  );
}
