import { Anton, Barlow, Manrope } from "next/font/google";

export const heroDisplay = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hero-display",
  display: "swap",
});
export const heroBody = Manrope({
  subsets: ["latin"],
  variable: "--font-hero-body",
  display: "swap",
});

export const promoBody = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-promo-body",
  display: "swap",
});
