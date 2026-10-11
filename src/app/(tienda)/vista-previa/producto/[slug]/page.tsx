import { CatalogPreview } from "@/components/catalog/preview";
export default async function PreviewProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variante?: string }>;
}) {
  const { slug } = await params,
    { variante } = await searchParams;
  return <CatalogPreview mode="product" slug={slug} selectedId={variante} />;
}
