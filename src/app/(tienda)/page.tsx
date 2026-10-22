import { getCatalog } from "@/modules/catalog/server";
import { publicCatalog } from "@/modules/catalog/model";
import { getEnvironment } from "@/lib/config/server";
import { CinematicHero } from "@/components/storefront/cinematic-hero";
import { HomeProducts } from "@/components/storefront/home-products";
import { HomePromotions } from "@/components/storefront/home-promotions";
import { readPromotions } from "@/modules/commerce/promotions-server";
import { ScrollBestSellers } from "@/components/storefront/scroll-best-sellers";
import { bestSellerExamples } from "@/modules/catalog/best-seller-examples";
import { CustomComboBuilder } from "@/components/storefront/custom-combo-builder";
import { comboOptions } from "@/modules/catalog/combo-options";
import { ReferenceGoals } from "@/components/storefront/reference-goals";
import { WhyStylo } from "@/components/storefront/why-stylo";
import { BrandMarquee } from "@/components/storefront/brand-marquee";
import { AthleteCall } from "@/components/storefront/athlete-call";
import { homeStoryData } from "@/components/storefront/home-story-data";
import { heroDisplay, heroBody } from "@/components/storefront/hero-fonts";
import "../reference-home.css";
import "../home-scroll-combos.css";
import "../home-story.css";
import {
  pageMetadata,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "@/modules/seo/metadata";

export function generateMetadata() {
  return pageMetadata({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
    siteUrl: getEnvironment().siteUrl,
    home: true,
  });
}

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
  const story = homeStoryData(data, imageBase);
  // There is no creation date in the catalog. Editorial tags control this section.
  const taggedArrivals = data.products
    .filter((p) =>
      p.tags.some((tag) =>
        /^(nuevo|novedad|novedades)$/.test(
          tag.trim().toLocaleLowerCase("es-AR"),
        ),
      ),
    )
    .slice(0, 4);
  const arrivalsAreExamples = taggedArrivals.length === 0;
  const arrivals = arrivalsAreExamples
    ? data.products
        .filter((product) => product.images.length && product.variants.some((variant) => variant.stock > 0))
        .slice(-4)
    : taggedArrivals;
  return (
    <div
      className={`reference-landing ${heroDisplay.variable} ${heroBody.variable}`}
    >
      <CinematicHero composition="reference" />
      <ScrollBestSellers
        products={bestSellerExamples(data, imageBase, promotions.state.promotions)}
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
        eyebrow={arrivalsAreExamples ? "SELECCIÓN DE EJEMPLO · STYLO" : "PARA TU PRÓXIMA RUTINA"}
        products={arrivals}
        catalog={data}
        imageBase={imageBase}
        unavailable={error}
      />
      <CustomComboBuilder categories={comboOptions(data, imageBase)} />
      <HomePromotions
        unavailable={promotions.error}
        imageBase={imageBase}
        catalog={data}
      />
      <WhyStylo stats={story.stats} />
      <BrandMarquee brands={story.brands} />
      <AthleteCall />
    </div>
  );
}
