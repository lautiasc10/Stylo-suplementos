import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { demoCatalog } from "../../src/modules/catalog/demo";
import type { Catalog } from "../../src/modules/catalog/model";
import type { Promotion } from "../../src/modules/commerce/promotions";
import { StructuredData } from "../../src/components/seo/structured-data";
import {
  absoluteHttpUrl,
  serializeJsonLd,
} from "../../src/modules/seo/metadata";
import {
  productDescription,
  productMetadata,
  productStructuredData,
} from "../../src/modules/seo/product";
import { publicSitemap } from "../../src/modules/seo/sitemap";
import normalizedImages from "../../src/modules/catalog/normalized-images.json";

const siteUrl = new URL("https://stylo.example");
const imageBase =
  "https://images.example/storage/v1/object/public/product-media";
const now = Date.parse("2026-10-21T12:00:00Z");
function input(catalog = demoCatalog(), promotions: Promotion[] = []) {
  return {
    catalog,
    slug: catalog.products[0].slug,
    imageBase,
    siteUrl,
    promotions,
    now,
  };
}
function group(catalog = demoCatalog(), promotions: Promotion[] = []) {
  const result = productStructuredData(input(catalog, promotions));
  if (!result || !("hasVariant" in result) || !result.hasVariant)
    throw new Error("Expected the multi-variant fixture");
  return result;
}
function sale(catalog: Catalog): Promotion {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Rebaja de prueba",
    active: true,
    kind: "sale",
    components: [
      { variantId: catalog.products[0].variants[0].id, quantity: 1 },
    ],
    listPrice: 3400000,
    cashPrice: 3000000,
    startsAt: null,
    endsAt: null,
  };
}

describe("SEO del catálogo público", () => {
  it("usa la descripción editorial, luego el texto existente y finalmente un resumen factual", () => {
    const product = demoCatalog().products[0];
    product.seoDescription = "  Descripción   aprobada. ";
    expect(productDescription(product, "Marca de prueba")).toBe(
      "Descripción aprobada.",
    );
    product.seoDescription = " ";
    product.description = "Información del fabricante.";
    expect(productDescription(product, "Marca de prueba")).toBe(
      product.description,
    );
    product.description = "";
    const fallback = productDescription(product, "Marca de prueba");
    expect(fallback).toContain(product.name);
    expect(fallback).toContain("Marca de prueba");
    expect(fallback).not.toMatch(/envíos|cuotas|garantía|certificad/i);
    product.description = "Descripción larga ".repeat(50);
    expect(productDescription(product, "Marca").length).toBeLessThanOrEqual(
      160,
    );
  });

  it("mantiene una canonical común y comparte solo la foto del sabor seleccionado", () => {
    const catalog = demoCatalog(),
      product = catalog.products[0],
      vanilla = product.variants[1];
    product.images = product.variants.map((variant, index) => ({
      id: `photo-${index}`,
      path: `${product.id}/${variant.id}.webp`,
      alt: variant.flavor,
      variantId: variant.id,
      position: 0,
    }));
    const metadata = productMetadata({
      ...input(catalog),
      selectedId: vanilla.id,
    });
    expect(metadata).toMatchObject({
      alternates: { canonical: `${siteUrl.origin}/producto/${product.slug}` },
      openGraph: {
        url: `${siteUrl.origin}/producto/${product.slug}`,
        images: [
          {
            url: `${imageBase}/${product.id}/${vanilla.id}.webp`,
            alt: vanilla.flavor,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        images: [{ url: `${imageBase}/${product.id}/${vanilla.id}.webp` }],
      },
    });
  });

  it("no usa la foto de otro sabor ni un logo como imagen comercial del SKU", () => {
    const catalog = demoCatalog(),
      product = catalog.products[0];
    product.images = [
      {
        id: "front",
        path: `${product.id}/chocolate.webp`,
        alt: "Chocolate",
        variantId: product.variants[0].id,
        position: 0,
      },
    ];
    expect(group(catalog).hasVariant[1]).not.toHaveProperty("image");
    expect(
      productMetadata({
        ...input(catalog),
        selectedId: product.variants[1].id,
      }),
    ).toMatchObject({
      openGraph: {
        images: [{ url: `${siteUrl.origin}/branding/logo-completo.webp` }],
      },
    });
    expect(group(catalog).hasVariant[0].image).toEqual([
      `${imageBase}/${product.id}/chocolate.webp`,
    ]);
  });

  it("permite fotos generales y prefiere los derivados normalizados registrados", () => {
    const catalog = demoCatalog(),
      product = catalog.products[0];
    product.images = [
      {
        id: "general",
        path: "general.webp",
        alt: "Foto común",
        variantId: null,
        position: 0,
      },
    ];
    expect(group(catalog).hasVariant.map((variant) => variant.image)).toEqual([
      [`${imageBase}/general.webp`],
      [`${imageBase}/general.webp`],
    ]);
    const [path, source] = Object.entries(normalizedImages)[0];
    product.images[0].path = path;
    expect(group(catalog).hasVariant[0].image).toEqual([
      new URL(source, siteUrl).href,
    ]);
  });

  it("representa los SKU, sabores, stock y precios exactos sin mover las relaciones", () => {
    const catalog = demoCatalog(),
      product = catalog.products[0];
    product.variants[0].cashPrice = 4100013;
    const data = group(catalog);
    expect(data.productGroupID).toBe(product.id);
    expect(data.hasVariant).toHaveLength(2);
    expect(data.hasVariant[0]).toMatchObject({
      sku: product.variants[0].sku,
      url: `${siteUrl.origin}/producto/${product.slug}?variante=${product.variants[0].id}`,
      isVariantOf: {
        "@id": `${siteUrl.origin}/producto/${product.slug}#product-group`,
      },
      additionalProperty: [
        { name: "Sabor", value: "Chocolate" },
        { name: "Presentación", value: "Envase" },
      ],
      offers: [
        {
          price: "41000.13",
          priceCurrency: "ARS",
          availability: "https://schema.org/InStock",
        },
        { price: "45000.00" },
      ],
    });
    expect(data.hasVariant[1].offers[0].availability).toBe(
      "https://schema.org/OutOfStock",
    );
    expect(serializeJsonLd(data)).not.toMatch(
      /aggregateRating|review|gtin|shippingDetails|merchantReturn|NewCondition|acceptedPaymentMethod/,
    );
  });

  it("aplica rebajas vigentes de una unidad, sin anunciar precios de combos o mayoristas", () => {
    const catalog = demoCatalog(),
      offer = sale(catalog);
    const data = group(catalog, [offer]);
    expect(data.hasVariant[0].offers.map((offer) => offer.price)).toEqual([
      "30000.00",
      "34000.00",
    ]);
    const quantity = {
      ...offer,
      kind: "quantity" as const,
      components: [{ ...offer.components[0], quantity: 2 }],
    };
    expect(group(catalog, [quantity]).hasVariant[0].offers[0].price).toBe(
      "41000.00",
    );
    const bundle = {
      ...offer,
      kind: "bundle" as const,
      components: [
        ...offer.components,
        { variantId: catalog.products[1].variants[0].id, quantity: 1 },
      ],
    };
    expect(group(catalog, [bundle]).hasVariant[0].offers[0].price).toBe(
      "41000.00",
    );
  });

  it("descarta ofertas vencidas, futuras, pausadas y con cupo agotado", () => {
    const catalog = demoCatalog(),
      offer = sale(catalog);
    for (const invalid of [
      { ...offer, endsAt: new Date(now).toISOString() },
      { ...offer, startsAt: new Date(now + 1000).toISOString() },
      { ...offer, active: false },
      { ...offer, maxUses: 1, used: 1 },
    ]) {
      expect(group(catalog, [invalid]).hasVariant[0].offers[0].price).toBe(
        "41000.00",
      );
    }
    const endsAt = new Date(now + 60000).toISOString();
    expect(
      group(catalog, [{ ...offer, endsAt }]).hasVariant[0].offers[0],
    ).toHaveProperty("validThrough", endsAt);
  });

  it("omite variantes privadas y productos o grupos ocultos del esquema y el sitemap", () => {
    const catalog = demoCatalog(),
      product = catalog.products[0];
    product.variants[1].active = false;
    const single = productStructuredData(input(catalog));
    expect(single).toMatchObject({
      "@type": "Product",
      sku: product.variants[0].sku,
    });
    expect(single).not.toHaveProperty("hasVariant");
    product.active = false;
    expect(productStructuredData(input(catalog))).toBeNull();
    expect(
      publicSitemap(catalog, siteUrl).some((entry) =>
        entry.url.endsWith(product.slug),
      ),
    ).toBe(false);
    product.active = true;
    catalog.brands.find((brand) => brand.id === product.brandId)!.active =
      false;
    expect(productStructuredData(input(catalog))).toBeNull();
    expect(productMetadata(input(catalog))).toMatchObject({
      title: "Producto no encontrado",
      robots: { index: false },
    });
  });

  it("el sitemap no inventa fechas ni expone filtros, búsquedas, variantes o rutas privadas", () => {
    const catalog = demoCatalog();
    const entries = publicSitemap(catalog, siteUrl);
    expect(entries).toHaveLength(4 + catalog.products.length);
    expect(entries.slice(0, 4).map((entry) => entry.url)).toEqual([
      siteUrl.href,
      `${siteUrl.origin}/catalogo`,
      `${siteUrl.origin}/nosotros`,
      `${siteUrl.origin}/contacto`,
    ]);
    expect(entries.every((entry) => Object.keys(entry).join() === "url")).toBe(
      true,
    );
    expect(serializeJsonLd(entries)).not.toMatch(
      /buscar|carrito|checkout|admin|vista-previa|variante|\?/,
    );
  });
});

describe("serialización segura", () => {
  it("bloquea el cierre del script sin alterar los textos al leer el JSON", () => {
    const value = {
      name: '</script><script>alert("catalog")</script>',
      description: "A & B < C \u2028",
    };
    const encoded = serializeJsonLd(value);
    expect(encoded).not.toContain("<");
    expect(JSON.parse(encoded)).toEqual(value);
    const html = renderToStaticMarkup(createElement(StructuredData, { value }));
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(
      renderToStaticMarkup(createElement(StructuredData, { value: null })),
    ).toBe("");
  });

  it("rechaza protocolos ejecutables y URLs con credenciales", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,bad",
      "file:///etc/passwd",
      "https://user:secret@example.test/photo.webp",
    ])
      expect(absoluteHttpUrl(url, siteUrl)).toBeUndefined();
    expect(absoluteHttpUrl("/media/front.webp", siteUrl)).toBe(
      `${siteUrl.origin}/media/front.webp`,
    );
  });
});
