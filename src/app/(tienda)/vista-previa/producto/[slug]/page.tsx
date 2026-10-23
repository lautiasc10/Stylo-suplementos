import { CatalogPreview } from "@/components/catalog/preview";
export default async function PreviewProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variante?: string; volver?: string }>;
}) {
  const { slug } = await params,
    { variante, volver } = await searchParams;
  return <CatalogPreview mode="product" slug={slug} selectedId={variante} returnHref={volver} />;
}
