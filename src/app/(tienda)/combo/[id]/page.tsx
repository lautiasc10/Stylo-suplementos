import { notFound } from "next/navigation";
import { getCatalog } from "@/modules/catalog/server";
import { readPromotions } from "@/modules/commerce/promotions-server";
import { availableBundles } from "@/modules/commerce/catalog-bundles";
import { ComboDetail } from "@/components/commerce/combo";
import { getEnvironment } from "@/lib/config/server";
import { pageMetadata } from "@/modules/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return pageMetadata({ title: "Combo STYLO", description: "Conocé los productos, presentaciones y precios del combo STYLO.", path: `/combo/${id}`, siteUrl: getEnvironment().siteUrl });
}

export default async function ComboPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ volver?: string }>;
}) {
  const [{ id }, { volver }, { catalog, error }, promotions] = await Promise.all([params, searchParams, getCatalog(), readPromotions()]);
  if (error || promotions.error) throw new Error("No pudimos consultar el combo. Intentá nuevamente.");
  const offer = availableBundles(catalog, promotions.state.promotions).find((item) => item.id === id);
  if (!offer) notFound();
  const config = getEnvironment().supabase;
  return <ComboDetail offer={offer} imageBase={config ? `${config.url}/storage/v1/object/public/product-media` : ""} returnHref={volver} />;
}
