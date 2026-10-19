import { expect, test } from "vitest";
import { existsSync, statSync } from "node:fs";
import {
  sceneFlavor,
  sceneIngredients,
  compactSceneIngredient,
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

test("cada fondo tiene una copia móvil existente y más liviana sin sustituir el original", () => {
  const flavors = [
    "Banana",
    "Frutilla",
    "Vainilla",
    "Ananá",
    "Cereza",
    "Chocolate",
    "Cookies",
    "Dulce de leche",
    "Frutos rojos",
    "Limón",
    "Multifruta",
    "Naranja",
    "Pomelo",
    "Sandía",
    "Uva",
  ];
  for (const flavor of flavors) {
    for (const source of sceneIngredients(sceneFlavor(flavor)!)) {
      const compact = compactSceneIngredient(source);
      expect(compact).toContain("/sabores/mobile/");
      expect(existsSync(`public${source}`)).toBe(true);
      expect(existsSync(`public${compact}`)).toBe(true);
      expect(statSync(`public${compact}`).size).toBeLessThan(
        statSync(`public${source}`).size,
      );
    }
  }
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
