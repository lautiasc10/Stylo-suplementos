import { getCatalog } from "@/modules/catalog/server";
import { publicCatalog } from "@/modules/catalog/model";
import { getEnvironment } from "@/lib/config/server";
import { CinematicHero } from "@/components/storefront/cinematic-hero";
import { HomeProducts } from "@/components/storefront/home-products";
import { readPromotions } from "@/modules/commerce/promotions-server";
import { ScrollBestSellers } from "@/components/storefront/scroll-best-sellers";
import { homeRanking } from "@/modules/catalog/home-ranking";
import { homeArrivals } from "@/modules/catalog/home-collections";
import { readStorefrontContent } from "@/modules/storefront/content-server";
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
  const [{ catalog, error }, promotions, content] = await Promise.all([
    getCatalog(),
    readPromotions(),
    readStorefrontContent(),
  ]);
  const data = publicCatalog(catalog);
  const config = getEnvironment().supabase;
  const imageBase = config
    ? `${config.url}/storage/v1/object/public/product-media`
    : "";
  const featured = data.products.filter((p) => p.featured);
  const story = homeStoryData(data, imageBase);
  const arrivals = homeArrivals(data.products);
  const ranking = homeRanking(data, imageBase, promotions.state.promotions, content.ranking);
  const period = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  return (
    <div
      className={`reference-landing ${heroDisplay.variable} ${heroBody.variable}`}
    >
      <CinematicHero composition="reference" />
      <ScrollBestSellers
        products={ranking.products}
        example={ranking.example}
        period={period}
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
      <CustomComboBuilder categories={comboOptions(data, imageBase)} />
      <WhyStylo stats={story.stats} />
      <BrandMarquee brands={story.brands} />
      <AthleteCall available={content.teamApplications} />
    </div>
  );
}
