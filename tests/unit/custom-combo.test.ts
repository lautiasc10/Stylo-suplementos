import { describe, expect, it } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { addCustomCombo, quoteCart } from "../../src/modules/commerce/cart";
import { comboOptions } from "../../src/modules/catalog/combo-options";
import { bestSellerExamples } from "../../src/modules/catalog/best-seller-examples";

describe("combos personalizados con catálogo real y guardado único", () => {
  it("agrega dos o tres presentaciones y calcula importes desde el catálogo", () => {
    const catalog = demoCatalog();
    const [protein, creatine, , shaker] = catalog.products;
    const ids = [protein.variants[0].id, creatine.variants[0].id, shaker.variants[0].id];
    const result = addCustomCombo(catalog, [], ids.map((variantId) => ({ variantId, quantity: 1 })));
    expect(result.error).toBeUndefined();
    expect(result.items.map((item) => item.variantId)).toEqual(ids);
    const quote = quoteCart(catalog, result.items);
    expect(quote.cashSubtotal).toBe(
      protein.variants[0].cashPrice + creatine.variants[0].cashPrice + shaker.variants[0].cashPrice,
    );
  });

  it("rechaza el conjunto completo si falta stock o hay un ID repetido", () => {
    const catalog = demoCatalog();
    const existing = [{ variantId: catalog.products[3].variants[0].id, quantity: 1 }];
    const unavailable = addCustomCombo(catalog, existing, [
      { variantId: catalog.products[0].variants[0].id, quantity: 1 },
      { variantId: catalog.products[2].variants[0].id, quantity: 1 },
    ]);
    expect(unavailable.error).toMatch(/stock/i);
    expect(unavailable.items).toEqual(existing);
    const duplicate = addCustomCombo(catalog, existing, [
      { variantId: catalog.products[0].variants[0].id, quantity: 1 },
      { variantId: catalog.products[0].variants[0].id, quantity: 1 },
    ]);
    expect(duplicate.error).toMatch(/diferentes/i);
    expect(duplicate.items).toEqual(existing);
  });

  it("solo ofrece presentaciones activas y con stock", () => {
    const catalog = demoCatalog();
    const options = comboOptions(catalog, "");
    expect(options.flatMap((category) => category.options).some((item) => item.variantId === catalog.products[2].variants[0].id)).toBe(false);
    expect(options.flatMap((category) => category.options).some((item) => item.variantId === catalog.products[0].variants[0].id)).toBe(true);
  });

  it("los ejemplos de más vendidos muestran productos fotografiados, sin inventar unidades vendidas", () => {
    const catalog = demoCatalog();
    const images: Record<string, string> = {};
    for (const [index, product] of catalog.products.entries()) {
      const path = `${product.id}/${product.id}.webp`;
      product.images.push({
        id: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        path,
        alt: product.name,
        variantId: product.variants[0].id,
        position: 0,
      });
      images[path] = "data:image/webp;base64,UklGRg==";
    }
    const examples = bestSellerExamples(catalog, "", [], images);
    expect(examples).toHaveLength(3);
    expect(new Set(examples.map((item) => item.id)).size).toBe(3);
    expect(examples.every((item) => item.href.startsWith("/producto/"))).toBe(true);
  });
});
