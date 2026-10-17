import { expect, test } from "vitest";
import { productFlavor } from "../../src/modules/catalog/product-flavor";

test("reconoce sabores reales normalizados sin depender de categoría o slug", () => {
  for (const [value, theme] of [
    ["LIMÓN", "limon"],
    ["fru. rojos", "frutos-rojos"],
    ["fru.rojos", "frutos-rojos"],
    ["Frutos rojos", "frutos-rojos"],
    ["Cookies & cream", "cookies"],
    ["Choco suizo", "chocolate"],
    ["Pomelo rosado", "pomelo"],
    ["Dulce de leche", "dulce"],
    ["Frutilla", "frutilla"],
    ["Vainilla", "vainilla"],
    ["Banana", "banana"],
    ["Ananá", "anana"],
    ["Citrus", "citrus"],
    ["Multifruta", "multifruta"],
    ["Naranja", "naranja"],
    ["Sandía", "sandia"],
    ["Uva", "uva"],
    ["Cereza", "cereza"],
    ["Otro sabor", "neutral"],
  ])
    expect(productFlavor(value)).toBe(theme);
});

test("los productos sin sabor conservan su fondo", () => {
  for (const value of ["", "   ", "Sin sabor", "Neutro", "Natural"])
    expect(productFlavor(value)).toBeNull();
});
