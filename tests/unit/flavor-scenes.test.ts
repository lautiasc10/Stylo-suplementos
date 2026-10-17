import { expect, test } from "vitest";
import {
  sceneFlavor,
  sceneIngredients,
} from "../../src/modules/catalog/flavor-scenes";

test("asocia los sabores del catálogo y sus alias con las decoraciones disponibles", () => {
  for (const [name, key] of [
    ["Choco suizo", "chocolate"],
    ["Chocolate", "chocolate"],
    ["Cookies & cream", "cookies"],
    ["Dulce de leche", "dulce"],
    ["fru. rojos", "frutos-rojos"],
    ["fru.rojos", "frutos-rojos"],
    ["Frutos rojos", "frutos-rojos"],
    ["LIMÓN", "limon"],
    ["Pomelo rosado", "pomelo"],
    ["Pomelo", "pomelo"],
    ["Ananá", "anana"],
    ["Cereza", "cereza"],
    ["Multifruta", "multifruta"],
    ["Naranja", "naranja"],
    ["Sandía", "sandia"],
    ["Uva", "uva"],
    ["Banana", "banana"],
    ["Frutilla", "frutilla"],
    ["Vainilla", "vainilla"],
  ])
    expect(sceneFlavor(name)).toBe(key);
});

test("citrus reutiliza limón y naranja sin inventar un recurso; neutros no llevan fruta", () => {
  const citrus = sceneFlavor("Citrus")!;
  expect(sceneIngredients(citrus)).toEqual([
    "/sabores/limon-decor-v1.webp",
    "/sabores/naranja-decor-v1.webp",
  ]);
  for (const name of ["", "Sin sabor", "Neutro", "Natural", "Otro sabor"])
    expect(sceneFlavor(name)).toBeNull();
});
