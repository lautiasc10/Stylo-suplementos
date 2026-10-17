/** Presentation only: never changes variant identity, prices or stock. */
export function productFlavor(value: string): string | null {
  const name = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!name || /^(sin sabor|neutro|natural|unflavou?red)$/.test(name))
    return null;
  const themes: [RegExp, string][] = [
    [/cookies|galleta|cookie/, "cookies"],
    [/dulce de leche|caramel/, "dulce"],
    [/fru\s*(?:tos)?\s*rojos|berries|frutos del bosque/, "frutos-rojos"],
    [/frutilla|fresa|strawberry/, "frutilla"],
    [/banana|banano|platano/, "banana"],
    [/vainilla|vanilla/, "vainilla"],
    [/choco|cacao/, "chocolate"],
    [/pomelo|grapefruit/, "pomelo"],
    [/limon|lemon/, "limon"],
    [/citrus|citrico/, "citrus"],
    [/naranja|orange/, "naranja"],
    [/anana|pineapple/, "anana"],
    [/cereza|cherry/, "cereza"],
    [/sandia|watermelon/, "sandia"],
    [/uva|grape/, "uva"],
    [/multifruta|tropical/, "multifruta"],
  ];
  return themes.find(([pattern]) => pattern.test(name))?.[1] ?? "neutral";
}
