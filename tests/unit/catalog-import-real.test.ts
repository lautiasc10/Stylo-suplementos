import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { parseCsv, planImport } from "../../src/modules/catalog/import";
import { parseMoney, type Catalog } from "../../src/modules/catalog/model";

const csvPath = process.env.STYLO_IMPORT_CSV;
const snapshotPath = process.env.STYLO_CATALOG_SNAPSHOT;

describe("CSV completo de STYLO", () => {
  it.skipIf(!csvPath)(
    "planifica 53 productos y 76 variantes sin duplicar en una segunda importación",
    () => {
      const rows = parseCsv(readFileSync(csvPath!, "utf8"));
      const sample = demoCatalog();
      const catalog: Catalog = {
        revision: 0,
        products: [],
        categories: sample.categories,
        brands: [
          {
            id: crypto.randomUUID(),
            name: "STAR NUTRITION",
            slug: "marca-star",
            active: true,
            sortOrder: 0,
          },
          {
            id: crypto.randomUUID(),
            name: "ONE FIT",
            slug: "marca-one-fit",
            active: true,
            sortOrder: 1,
          },
          {
            id: crypto.randomUUID(),
            name: "XBODY",
            slug: "marca-xbody",
            active: true,
            sortOrder: 2,
          },
        ],
      };
      const first = planImport(rows, catalog);
      expect(first.errors).toEqual([]);
      expect(first.rows).toBe(76);
      expect(first.created).toBe(76);
      expect(first.catalog.products).toHaveLength(53);
      expect(first.createdCategories.map((category) => category.slug)).toEqual([
        "otros-suplementos",
      ]);
      expect(
        new Set(
          first.catalog.products.flatMap((product) =>
            product.variants.map((variant) => variant.sku),
          ),
        ).size,
      ).toBe(76);
      const headers = rows[0].map(String);
      for (const cells of rows.slice(1)) {
        const row = Object.fromEntries(
          headers.map((header, index) => [header, String(cells[index] ?? "")]),
        );
        const product = first.catalog.products.find(
          (item) => item.slug === row.producto_slug,
        );
        const variant = product?.variants.find(
          (item) => item.sku === row.sku.toUpperCase(),
        );
        expect(variant).toMatchObject({
          flavor: row.sabor,
          size: row.tamano,
          presentation: row.presentacion,
          listPrice: parseMoney(row.precio_lista),
          cashPrice: parseMoney(row.precio_efectivo),
          stock: Number(row.stock),
        });
      }
      const again = planImport(rows, first.catalog);
      expect(again.errors).toEqual([]);
      expect(again.created).toBe(0);
      expect(again.updated).toBe(76);
      expect(again.createdCategories).toEqual([]);
      expect(again.catalog.products).toHaveLength(53);
    },
  );
  it.skipIf(!csvPath || !snapshotPath)(
    "planifica el CSV sobre el catálogo actual sin alterar los productos previos",
    () => {
      const rows = parseCsv(readFileSync(csvPath!, "utf8"));
      const current = JSON.parse(
        readFileSync(snapshotPath!, "utf8"),
      ) as Catalog;
      // The anonymous snapshot hides the admin-only threshold as null.
      if (current.lowStockThreshold == null) current.lowStockThreshold = 0;
      const plan = planImport(rows, current);
      expect(plan.errors).toEqual([]);
      expect(plan.created).toBe(76);
      expect(plan.catalog.products).toHaveLength(current.products.length + 53);
      for (const product of current.products)
        expect(
          plan.catalog.products.find((item) => item.id === product.id),
        ).toEqual(product);
    },
  );
});
