import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { demoCatalog } from "../../src/modules/catalog/demo";
import type { ProductDetailProps } from "../../src/components/catalog/product-detail";

const source = vi.hoisted(() => ({ catalog: vi.fn(), promotions: vi.fn() }));
vi.mock("@/modules/catalog/server", () => ({ getCatalog: source.catalog }));
vi.mock("@/modules/commerce/promotions-server", () => ({
  readPromotions: source.promotions,
}));
vi.mock("@/lib/config/server", () => ({
  getEnvironment: () => ({
    siteUrl: new URL("https://stylo.example"),
    supabase: null,
  }),
}));
vi.mock("@/components/catalog/product-detail", () => ({
  ProductDetail: ({ product, selectedId }: ProductDetailProps) =>
    createElement("div", { "data-selected": selectedId ?? "" }, product.name),
}));
import ProductPage, {
  generateMetadata,
} from "../../src/app/(tienda)/producto/[slug]/page";

const request = (slug: string, variante?: string) => ({
  params: Promise.resolve({ slug }),
  searchParams: Promise.resolve({ variante }),
});

describe("SEO de la ruta de producto en servidor", () => {
  beforeEach(() => {
    source.catalog.mockReset();
    source.promotions.mockResolvedValue({
      state: { revision: 0, promotions: [] },
      error: false,
    });
  });

  it("incluye todos los SKU en el HTML inicial y conserva la selección de la URL", async () => {
    const catalog = demoCatalog(),
      product = catalog.products[0],
      variant = product.variants[1];
    product.seoDescription = "";
    product.description = "";
    source.catalog.mockResolvedValue({
      catalog,
      configured: true,
      error: false,
    });
    const params = request(product.slug, variant.id);
    const metadata = await generateMetadata(params);
    expect(metadata.description).toContain(product.name);
    expect(metadata.alternates).toEqual({
      canonical: `https://stylo.example/producto/${product.slug}`,
    });
    const html = renderToStaticMarkup(await ProductPage(params));
    expect(html).toContain(`data-selected="${variant.id}"`);
    const json = html.match(
      /<script type="application\/ld\+json">([\s\S]+?)<\/script>/,
    )?.[1];
    expect(json).toBeDefined();
    const data = JSON.parse(json!);
    expect(data.hasVariant.map((item: { sku: string }) => item.sku)).toEqual(
      product.variants.map((item) => item.sku),
    );
    const invalid = renderToStaticMarkup(
      await ProductPage(request(product.slug, "missing-variant")),
    );
    expect(invalid).toContain('data-selected=""');
  });

  it("no publica una ficha o esquema de un producto oculto", async () => {
    const catalog = demoCatalog(),
      product = catalog.products[0];
    product.active = false;
    source.catalog.mockResolvedValue({
      catalog,
      configured: true,
      error: false,
    });
    const params = request(product.slug);
    expect(await generateMetadata(params)).toMatchObject({
      title: "Producto no encontrado",
      robots: { index: false },
    });
    await expect(ProductPage(params)).rejects.toThrow();
  });

  it("un fallo del catálogo conserva la ruta de error y no emite un producto vacío", async () => {
    source.catalog.mockResolvedValue({
      catalog: demoCatalog(),
      configured: true,
      error: true,
    });
    await expect(ProductPage(request("proteina-de-prueba"))).rejects.toThrow(
      "No pudimos consultar el catálogo.",
    );
  });
});
