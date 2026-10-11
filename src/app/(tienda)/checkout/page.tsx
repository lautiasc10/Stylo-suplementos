import { Checkout } from "@/components/commerce/checkout";
export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <section className="container interior-page">
      <Checkout />
    </section>
  );
}
