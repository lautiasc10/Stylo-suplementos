import { productFlavor } from "./product-flavor";

/** User-supplied decorations only. Citrus shares the available citrus fruits. */
const assets = {
  banana: ["/sabores/banana-decor-v1.webp"],
  frutilla: ["/sabores/frutilla-decor-v1.webp"],
  vainilla: ["/sabores/vainilla-decor-v1.webp"],
  anana: ["/sabores/anana-decor-v1.webp"],
  cereza: ["/sabores/cereza-decor-v1.webp"],
  chocolate: ["/sabores/chocolate-decor-v1.webp"],
  cookies: ["/sabores/cookies-decor-v1.webp"],
  dulce: ["/sabores/dulce-de-leche-decor-v1.webp"],
  "frutos-rojos": ["/sabores/frutos-rojos-decor-v1.webp"],
  limon: ["/sabores/limon-decor-v1.webp"],
  multifruta: ["/sabores/multifruta-decor-v1.webp"],
  naranja: ["/sabores/naranja-decor-v1.webp"],
  pomelo: ["/sabores/pomelo-decor-v1.webp"],
  sandia: ["/sabores/sandia-decor-v1.webp"],
  uva: ["/sabores/uva-decor-v1.webp"],
  citrus: ["/sabores/limon-decor-v1.webp", "/sabores/naranja-decor-v1.webp"],
} as const;

export type SceneFlavor = keyof typeof assets;

export function sceneFlavor(value: string): SceneFlavor | null {
  const flavor = productFlavor(value);
  return flavor && Object.hasOwn(assets, flavor)
    ? (flavor as SceneFlavor)
    : null;
}

export const sceneIngredients = (flavor: SceneFlavor): readonly string[] =>
  assets[flavor];
export const sceneIngredient = (flavor: SceneFlavor) => assets[flavor][0];
