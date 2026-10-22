import { Anton, Barlow } from "next/font/google";

export const heroDisplay = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hero-display",
  display: "swap",
});
export const heroBody = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const promoBody = heroBody;
