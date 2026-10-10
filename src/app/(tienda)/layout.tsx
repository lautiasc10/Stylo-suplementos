import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <><Header /><main id="contenido">{children}</main><Footer /></>;
}
