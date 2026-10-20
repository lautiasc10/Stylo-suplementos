import { Anton, Manrope } from "next/font/google";

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
