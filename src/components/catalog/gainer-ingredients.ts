// Independent transparent cutouts; unsupported flavors retain only the dust.
const ingredients = {
  banana: ["banana-rodaja-1.webp", "banana-rodaja-2.webp"],
  frutilla: ["frutilla-entera-1.webp", "frutilla-entera-2.webp"],
  vainilla: ["vainilla-flor-1.webp", "vainilla-vaina-1.webp"],
  cookies: ["galleta-trozo-1.webp", "galleta-trozo-2.webp"],
};

export type GainerIngredientKey = keyof typeof ingredients;

export function gainerIngredientKey(
  flavor: string,
): GainerIngredientKey | null {
  const name = flavor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/cookies|cookie|galleta/.test(name)) return "cookies";
  if (/banana/.test(name)) return "banana";
  if (/frutilla|fresa/.test(name)) return "frutilla";
  if (/vainilla|vanilla/.test(name)) return "vainilla";
  return null;
}

export function gainerIngredientSources(key: GainerIngredientKey | null) {
  return key ? ingredients[key].map((file) => `/sabores/${file}`) : [];
}
