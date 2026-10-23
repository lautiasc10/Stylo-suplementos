import { CatalogPreview } from "@/components/catalog/preview";

export default async function PreviewComboPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ volver?: string }>;
}) {
  const [{ id }, { volver }] = await Promise.all([params, searchParams]);
  return <CatalogPreview mode="combo" comboId={id} returnHref={volver} />;
}
