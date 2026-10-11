import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { getCatalog } from "@/modules/catalog/server";
import { CartProvider } from "@/components/commerce/cart-provider";
import { readCart } from "@/modules/commerce/server";
import "../commerce.css";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { catalog, configured, error } = await getCatalog();
  const cart = await readCart();
  const visible =
    configured && !error
      ? catalog.categories
          .filter((item) => item.active)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : undefined;
  return (
    <CartProvider initialQuote={cart}>
      <Header catalogCategories={visible} />
      <main id="contenido">{children}</main>
      <Footer />
    </CartProvider>
  );
}
