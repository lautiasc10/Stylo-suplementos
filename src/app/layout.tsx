import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./storefront.css";
import "./catalog.css";
import { getEnvironment } from "@/lib/config/server";

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
      default: "STYLO Suplementos | Potenciá tu mejor versión",
      template: "%s | STYLO Suplementos",
    },
    description:
      "Suplementación deportiva, accesorios y bienestar. Conocé STYLO Suplementos en Rosario, Argentina.",
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
    <html lang="es-AR">
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
