import { getCatalog } from "@/modules/catalog/server";
import { publicCatalog } from "@/modules/catalog/model";
import { getEnvironment } from "@/lib/config/server";
import { CinematicHero } from "@/components/storefront/cinematic-hero";
import { HomeProducts } from "@/components/storefront/home-products";
import { HomePromotions } from "@/components/storefront/home-promotions";
import { readPromotions } from "@/modules/commerce/promotions-server";
import { ReferenceProductReveal } from "@/components/storefront/reference-product-reveal";
import { referenceProduct } from "@/components/storefront/reference-product";
import { ReferenceGoals } from "@/components/storefront/reference-goals";
import { heroDisplay, heroBody } from "@/components/storefront/hero-fonts";
import "../reference-home.css";

export default async function HomePage() {
  const [{ catalog, error }, promotions] = await Promise.all([
    getCatalog(),
    readPromotions(),
  ]);
  const data = publicCatalog(catalog);
  const config = getEnvironment().supabase;
  const imageBase = config
    ? `${config.url}/storage/v1/object/public/product-media`
    : "";
  const featured = data.products.filter((p) => p.featured);
  // There is no creation date in the catalog. Editorial tags control this section.
  const arrivals = data.products
    .filter((p) =>
      p.tags.some((tag) =>
        /^(nuevo|novedad|novedades)$/.test(
          tag.trim().toLocaleLowerCase("es-AR"),
        ),
      ),
    )
    .slice(0, 4);
  return (
    <div
      className={`reference-landing ${heroDisplay.variable} ${heroBody.variable}`}
    >
      <CinematicHero composition="reference" />
      <ReferenceProductReveal
        product={referenceProduct(data, imageBase, promotions.state.promotions)}
      />
      <ReferenceGoals />
      <HomeProducts
        id="destacados"
        title="Productos destacados"
        eyebrow="LA SELECCIÓN STYLO"
        products={featured}
        catalog={data}
        imageBase={imageBase}
        unavailable={error}
      />
      <HomeProducts
        id="novedades"
        title="Novedades"
        eyebrow="PARA TU PRÓXIMA RUTINA"
        products={arrivals}
        catalog={data}
        imageBase={imageBase}
        unavailable={error}
      />
      <HomePromotions
        unavailable={promotions.error}
        imageBase={imageBase}
        catalog={data}
      />
    </div>
  );
}
