import { CartPage } from "@/components/commerce/cart-contents";
export const metadata = {
  title: "Tu carrito",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <section className="container interior-page">
      <CartPage />
    </section>
  );
}
