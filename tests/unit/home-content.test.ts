import { describe, expect, it } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import {
  homeArrivals,
  isNewArrival,
  setNewArrivalTags,
} from "../../src/modules/catalog/home-collections";
import { homeRanking } from "../../src/modules/catalog/home-ranking";
import { validateTeamInput } from "../../src/modules/storefront/team";
import { storeContact } from "../../src/modules/storefront/contact";

describe("contenido real de STYLO", () => {
  it("Novedades no se deduce del orden de carga ni inventa productos nuevos", () => {
    const products = demoCatalog().products;
    products.forEach((product) => (product.tags = []));
    expect(homeArrivals(products)).toEqual([]);
    products[1].tags = ["  NUEVO "];
    expect(homeArrivals(products).map((p) => p.id)).toEqual([products[1].id]);
    expect(isNewArrival({ tags: ["novedades"] })).toBe(true);
    expect(setNewArrivalTags(["oferta", " NUEVO ", "novedades"], true)).toEqual(
      ["oferta", "novedad"],
    );
    expect(setNewArrivalTags(["novedad", "proteina"], false)).toEqual([
      "proteina",
    ]);
  });
  it("el ranking real conserva orden y SKU; sin tres productos no mezcla puestos ficticios", () => {
    const catalog = demoCatalog();
    const products = catalog.products.slice(0, 3);
    products.forEach(
      (product, i) =>
        (product.images = [
          {
            id: product.id,
            path: `${product.id}/${product.id}.webp`,
            alt: product.name,
            position: 0,
            variantId: product.variants[0].id,
          },
        ]),
    );
    const ranking = [...products]
      .reverse()
      .map((p) => ({ productId: p.id, variantId: p.variants[0].id }));
    const result = homeRanking(
      catalog,
      "https://example.com/storage/v1/object/public/product-media",
      [],
      ranking,
    );
    expect(result.example).toBe(false);
    expect(result.products.map((p) => p.id)).toEqual(
      ranking.map((p) => p.productId),
    );
    expect(result.products.map((p) => p.variantId)).toEqual(
      ranking.map((p) => p.variantId),
    );
    expect(
      homeRanking(
        catalog,
        "https://example.com/storage/v1/object/public/product-media",
        [],
        ranking.slice(0, 2),
      ).example,
    ).toBe(true);
  });
  it("valida la consulta y usa solo los canales públicos confirmados", () => {
    const input = {
      kind: "both" as const,
      name: "Persona de prueba",
      email: "prueba@example.com",
      instagram: "@prueba",
      discipline: "Gym",
      message: "",
      consent: true,
    };
    expect(validateTeamInput(input)).toBeNull();
    expect(validateTeamInput({ ...input, consent: false })).toMatch(
      /autorización/,
    );
    expect(validateTeamInput({ ...input, email: "correo\ninvalido" })).toMatch(
      /email/,
    );
    expect(storeContact.whatsapp).toBe("https://wa.me/5493415316456");
    expect(storeContact.email).toBe("stylo.suplementos@gmail.com");
    expect(storeContact).not.toHaveProperty("address");
  });
});
