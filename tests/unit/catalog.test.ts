import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";
import {
  filterCatalog,
  parseMoney,
  publicCatalog,
  validateCatalog,
  variantImages,
  variantInformationImages,
} from "../../src/modules/catalog/model";
import {
  importColumns,
  parseCsv,
  planImport,
  readImportFile,
  validateXlsxArchive,
} from "../../src/modules/catalog/import";

const row = [
  "proteina-de-prueba",
  "Proteína de prueba",
  "marca-de-prueba-a",
  "proteinas",
  "Descripción actualizada",
  "DEMO-1-A",
  "Chocolate",
  "1 kg",
  "Envase",
  "49000,29",
  "45000.10",
  "4",
  "true",
];
describe("catálogo y precios", () => {
  it("comparte fichas informativas sin mezclarlas con las fotos del envase", () => {
    const catalog = demoCatalog();
    const product = catalog.products[0];
    const [chocolate, vanilla] = product.variants;
    const shared = {
      id: "00000000-0000-4000-8000-000000000301",
      path: `${product.id}/00000000-0000-4000-8000-000000000401.webp`,
      alt: "Ficha común",
      variantId: null,
      position: 0,
    };
    product.informationImages = [
      shared,
      {
        id: "00000000-0000-4000-8000-000000000302",
        path: `${product.id}/00000000-0000-4000-8000-000000000402.webp`,
        alt: "Ingredientes de vainilla",
        variantId: vanilla.id,
        position: 1,
      },
    ];
    expect(validateCatalog(catalog)).toEqual([]);
    expect(variantInformationImages(product, chocolate.id)).toEqual([shared]);
    expect(variantInformationImages(product, vanilla.id)).toHaveLength(2);
    expect(variantImages(product, chocolate.id)).toEqual([]);
    const imported = planImport([Array.from(importColumns), row], catalog);
    expect(
      imported.catalog.products.find((p) => p.id === product.id)
        ?.informationImages,
    ).toEqual(product.informationImages);
    product.informationImages[0].path = "otra-carpeta/archivo.webp";
    expect(validateCatalog(catalog).join(" ")).toMatch(/archivo/);
  });
  it("la galería conserva el orden y no mezcla fotos de otras variantes", () => {
    const product = demoCatalog().products[0];
    const [chocolate, vanilla] = product.variants;
    product.images = [
      {
        id: "general",
        path: "general",
        alt: "General",
        variantId: null,
        position: 0,
      },
      {
        id: "back",
        path: "back",
        alt: "Dorso",
        variantId: chocolate.id,
        position: 2,
      },
      {
        id: "vanilla",
        path: "vanilla",
        alt: "Vainilla",
        variantId: vanilla.id,
        position: 3,
      },
      {
        id: "front",
        path: "front",
        alt: "Frente",
        variantId: chocolate.id,
        position: 1,
      },
    ];
    expect(
      variantImages(product, chocolate.id).map((image) => image.id),
    ).toEqual(["front", "back"]);
    expect(variantImages(product, vanilla.id).map((image) => image.id)).toEqual(
      ["vanilla"],
    );
    expect(
      variantImages(product, "without-photos").map((image) => image.id),
    ).toEqual(["general"]);
    expect(product.images.map((image) => image.id)).toEqual([
      "general",
      "back",
      "vanilla",
      "front",
    ]);
  });
  it("representa los importes exactamente en centavos", () => {
    expect(parseMoney("0.29")).toBe(29);
    expect(parseMoney("45000,10")).toBe(4500010);
    expect(() => parseMoney("45.000,10")).toThrow();
    expect(() => parseMoney("1.999")).toThrow();
    expect(() => parseMoney("-1")).toThrow();
  });
  it("acepta los fixtures y rechaza SKU duplicado entre productos", () => {
    const catalog = demoCatalog();
    expect(validateCatalog(catalog)).toEqual([]);
    catalog.products[1].variants[0].sku = catalog.products[0].variants[0].sku;
    expect(validateCatalog(catalog).join(" ")).toMatch(/SKU/);
  });
  it("búsqueda ignora acentos y encuentra marcas", () => {
    expect(filterCatalog(demoCatalog(), { q: "proteina" })).toHaveLength(1);
    expect(
      filterCatalog(demoCatalog(), { q: "marca de prueba b" }),
    ).toHaveLength(2);
  });
  it("aplica sabor, stock y precio a la misma variante", () => {
    expect(
      filterCatalog(demoCatalog(), {
        flavor: "Vainilla",
        availability: "in-stock",
      }),
    ).toHaveLength(0);
    expect(
      filterCatalog(demoCatalog(), {
        flavor: "Vainilla",
        availability: "out-of-stock",
        min: "47000",
        max: "47000",
      })[0].variant.sku,
    ).toBe("DEMO-1-B");
  });
  it("ordena y filtra por precio de lista, conservando productos agotados", () => {
    const results = filterCatalog(demoCatalog(), { sort: "price-asc" });
    expect(results).toHaveLength(4);
    expect(results[0].product.slug).toBe("shaker-de-prueba");
    expect(
      results.find((item) => item.product.slug === "pre-entreno-de-prueba")
        ?.variant.stock,
    ).toBe(0);
    expect(filterCatalog(demoCatalog(), { min: "50000" })).toHaveLength(0);
  });
  it("no publica productos, marcas o categorías ocultos", () => {
    const data = demoCatalog();
    data.products[0].active = false;
    data.brands[1].active = false;
    expect(publicCatalog(data).products).toHaveLength(1);
    data.categories[2].active = false;
    expect(publicCatalog(data).products).toHaveLength(0);
  });
});
describe("importación sin pérdida de datos", () => {
  it("lee CSV con BOM, separadores, comillas y saltos de línea", () => {
    expect(parseCsv('\uFEFFa;b\r\n"uno;dos";"tres\ncuatro"\r\n')).toEqual([
      ["a", "b"],
      ["uno;dos", "tres\ncuatro"],
    ]);
    expect(() => parseCsv('a;b\n"sin cierre')).toThrow();
  });
  it("actualiza por SKU y conserva imágenes y variantes ausentes", () => {
    const current = demoCatalog();
    current.products[0].images = [
      {
        id: "00000000-0000-4000-8000-000000000090",
        path: `${current.products[0].id}/00000000-0000-4000-8000-000000000091.webp`,
        alt: "Foto de prueba",
        variantId: null,
        position: 0,
      },
    ];
    const before = structuredClone(current);
    const plan = planImport([Array.from(importColumns), row], current);
    expect(plan.errors).toEqual([]);
    expect(plan.updated).toBe(1);
    expect(plan.catalog.products[0].variants[0].listPrice).toBe(4900029);
    expect(plan.catalog.products[0].variants).toHaveLength(2);
    expect(plan.catalog.products[0].images).toEqual(before.products[0].images);
    expect(current).toEqual(before);
  });
  it("bloquea el lote completo ante SKU repetido o fila inválida", () => {
    const data = demoCatalog();
    const repeated = planImport([Array.from(importColumns), row, row], data);
    expect(repeated.errors.join(" ")).toMatch(/duplicado/);
    expect(repeated.catalog).toEqual(data);
    const invalid = [...row];
    invalid[11] = "-1";
    expect(
      planImport([Array.from(importColumns), row, invalid], data).catalog,
    ).toEqual(data);
  });
  it("impide mover SKU de producto y crear marcas implícitas", () => {
    const moved = [...row];
    moved[0] = "creatina-de-prueba";
    expect(
      planImport([Array.from(importColumns), moved], demoCatalog()).errors.join(
        " ",
      ),
    ).toMatch(/mover/);
    const brand = [...row];
    brand[2] = "marca-inexistente";
    expect(
      planImport([Array.from(importColumns), brand], demoCatalog()).errors.join(
        " ",
      ),
    ).toMatch(/no existe/);
  });
  it("reconoce nombres normalizados y prepara categorías nuevas sin tocar el catálogo", () => {
    const current = demoCatalog();
    const input = [...row];
    input[2] = "MARCA  DE PRUEBA Á";
    input[3] = "Prótéínas|Otros suplementos";
    const plan = planImport([Array.from(importColumns), input], current);
    expect(plan.errors).toEqual([]);
    expect(plan.createdCategories.map((item) => item.slug)).toEqual([
      "otros-suplementos",
    ]);
    expect(plan.catalog.products[0].categoryIds).toEqual([
      current.categories[0].id,
      plan.createdCategories[0].id,
    ]);
    expect(current.categories).toHaveLength(plan.catalog.categories.length - 1);
    expect(
      planImport([Array.from(importColumns), input], plan.catalog)
        .createdCategories,
    ).toEqual([]);
  });
  it("reutiliza productos por SKU o nombre y bloquea variantes repetidas con otro SKU", () => {
    const current = demoCatalog();
    const alias = [...row];
    alias[0] = "otra-url-de-proteina";
    const update = planImport([Array.from(importColumns), alias], current);
    expect(update.errors).toEqual([]);
    expect(update.updated).toBe(1);
    expect(update.catalog.products).toHaveLength(current.products.length);
    expect(update.catalog.products[0].slug).toBe(current.products[0].slug);
    const newSku = [...alias];
    newSku[5] = "NUEVO-1";
    newSku[6] = "Frutilla";
    const matchedName = planImport(
      [Array.from(importColumns), newSku],
      current,
    );
    expect(matchedName.errors).toEqual([]);
    expect(matchedName.created).toBe(1);
    expect(matchedName.catalog.products).toHaveLength(current.products.length);
    const repeatedVariant = [...alias];
    repeatedVariant[5] = "NUEVO-2";
    expect(
      planImport(
        [Array.from(importColumns), repeatedVariant],
        current,
      ).errors.join(" "),
    ).toMatch(/variante ya existe/);
  });
  it("detecta productos repetidos por nombre con distintas URL dentro del archivo", () => {
    const first = [...row];
    first[0] = "nombre-compartido-a";
    first[5] = "PRUEBA-A";
    first[6] = "Chocolate";
    const second = [...first];
    second[0] = "nombre-compartido-b";
    second[5] = "PRUEBA-B";
    second[6] = "Vainilla";
    const current = { ...demoCatalog(), products: [] };
    const plan = planImport(
      [Array.from(importColumns), first, second],
      current,
    );
    expect(plan.errors.join(" ")).toMatch(/dos URL distintas/);
    expect(plan.catalog).toEqual(current);
  });
  it("rechaza archivos que no son Excel antes de descomprimir", () => {
    expect(() => validateXlsxArchive(new Uint8Array(100))).toThrow();
  });
  it("lee un Excel real y conserva los decimales", async () => {
    const bytes = new Uint8Array(readFileSync("tests/fixtures/catalog.xlsx"));
    const rows = await readImportFile(new File([bytes], "catalog.xlsx"));
    expect(rows[1][1]).toBe("Proteína de prueba");
    const plan = planImport(rows, demoCatalog());
    expect(plan.errors).toEqual([]);
    expect(plan.catalog.products[0].variants[0].listPrice).toBe(4900029);
  });
});
