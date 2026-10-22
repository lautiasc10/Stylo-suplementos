import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { heroDisplay, heroBody } from "@/components/storefront/hero-fonts";
import "./globals.css";
import "./storefront.css";
import "./hero.css";
import "./catalog.css";
import "./product-media.css";
import "./product-detail.css";
import "./variant-spinner.css";
import "./product-flavors.css";
import "./flavor-choreography.css";
import "./pricing-hierarchy.css";
import "./neutral-product.css";
import "./mobile-storefront.css";
import "./purchase-pricing.css";
import "./catalog-compact.css";
import "./flavor-legibility.css";
import { getEnvironment } from "@/lib/config/server";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/modules/seo/metadata";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};
export function generateMetadata(): Metadata {
  const config = getEnvironment();
  return {
    metadataBase: config.siteUrl,
    title: {
      default: SITE_TITLE,
      template: "%s | STYLO Suplementos",
    },
    description: SITE_DESCRIPTION,
    robots: { index: false, follow: false },
    icons: {
      icon: "/branding/logo-principal.webp",
      apple: "/branding/logo-principal.webp",
    },
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: "STYLO Suplementos",
      images: [
        {
          url: "/branding/logo-completo.webp",
          width: 640,
          height: 640,
          alt: "STYLO Suplementos",
        },
      ],
    },
  };
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${display.variable} ${body.variable} ${heroDisplay.variable} ${heroBody.variable}`}>
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
