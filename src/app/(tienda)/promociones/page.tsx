import { getCatalog } from "@/modules/catalog/server";
import { publicCatalog } from "@/modules/catalog/model";
import { getEnvironment } from "@/lib/config/server";
import { pageMetadata } from "@/modules/seo/metadata";
import { PromotionsExperience } from "@/components/storefront/promotions-experience";

export function generateMetadata() {
  return pageMetadata({
    title: "Promociones",
    description: "Descubrí las promociones vigentes de STYLO Suplementos: productos, precios por cantidad y combos disponibles.",
    path: "/promociones",
    siteUrl: getEnvironment().siteUrl,
  });
}

export default async function PromotionsPage() {
  const { catalog, error } = await getCatalog();
  const config = getEnvironment().supabase;
  return (
    <PromotionsExperience
      catalog={publicCatalog(catalog)}
      imageBase={config ? `${config.url}/storage/v1/object/public/product-media` : ""}
      unavailable={error}
    />
  );
}
