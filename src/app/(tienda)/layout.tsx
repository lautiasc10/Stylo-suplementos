import { Header } from "@/components/storefront/header";
import { HomeIntroProvider } from "@/components/storefront/home-intro";
import { Footer } from "@/components/storefront/footer";
import { getCatalog } from "@/modules/catalog/server";
import { CartProvider } from "@/components/commerce/cart-provider";
import { publicCatalog } from "@/modules/catalog/model";
import { readPromotions } from "@/modules/commerce/promotions-server";
import { readCart } from "@/modules/commerce/server";
import { cartSuggestions } from "@/modules/commerce/cart";
import "../commerce.css";
import "../search.css";
import "../reference-commerce.css";
import { getEnvironment } from "@/lib/config/server";
import { navigationCategories } from "@/components/storefront/navigation-model";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { catalog, configured, error } = await getCatalog();
  const config = getEnvironment().supabase;
  const cart = await readCart();
  const promotions = await readPromotions();
  const activePromotions = promotions.error
    ? []
    : promotions.state.promotions.filter((p) => p.active);
  const offerIds = new Set(
    activePromotions.flatMap((p) => p.components.map((c) => c.variantId)),
  );
  const offerCatalog = publicCatalog(catalog);
  // Send only the presentations needed to describe offers, without catalog photos.
  offerCatalog.products = offerCatalog.products.flatMap((p) => {
    const variants = p.variants.filter((v) => offerIds.has(v.id));
    return variants.length ? [{ ...p, variants, images: [] }] : [];
  });
  const visible =
    configured && !error
      ? navigationCategories(
          catalog,
          config ? `${config.url}/storage/v1/object/public/product-media` : "",
        )
      : undefined;
  return (
    <CartProvider
      initialQuote={cart}
      initialCatalog={offerCatalog}
      initialPromotions={activePromotions}
      initialSuggestions={cartSuggestions(catalog)}
      imageBase={
        config ? `${config.url}/storage/v1/object/public/product-media` : ""
      }
    >
      <HomeIntroProvider>
        <Header catalogCategories={visible} />
        <main id="contenido">{children}</main>
        <Footer />
      </HomeIntroProvider>
    </CartProvider>
  );
}
