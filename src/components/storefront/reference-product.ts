import { galleryPhotos } from "@/components/catalog/gallery-images";
import {
  flavorLabel,
  formatPrice,
  packagingLabel,
  publicCatalog,
  type Catalog,
} from "@/modules/catalog/model";
import { productOffers } from "@/modules/commerce/product-offers";
import { priceLines, type Promotion } from "@/modules/commerce/promotions";

export type ReferenceProduct = {
  id: string;
  name: string;
  title: string[];
  brand: string;
  description: string;
  href: string;
  image: { src: string; srcSet?: string; alt: string };
  facts: { label: string; value: string }[];
};

/** Real product and real prices only. Never substitute the reference's sample nutrition claims. */
export function referenceProduct(
  catalog: Catalog,
  imageBase: string,
  promotions: Promotion[] = [],
  imageUrls: Record<string, string> = {},
): ReferenceProduct | null {
  catalog = publicCatalog(catalog);
  const ranked = catalog.products.slice().sort((a, b) => {
    const score = (p: typeof a) =>
      Number(/whey/i.test(p.name)) * 100 +
      Number(
        /star/i.test(
          catalog.brands.find((brand) => brand.id === p.brandId)?.name ?? "",
        ),
      ) *
        20 +
      Number(p.featured) * 10;
    return score(b) - score(a);
  });
  for (const product of ranked) {
    const variants = product.variants
      .filter((variant) => variant.active)
      .slice()
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
    for (const variant of variants) {
      const photo = galleryPhotos(product, variant.id, imageBase, imageUrls)[0];
      if (!photo?.src) continue;
      const name = packagingLabel(product.name);
      const offers = productOffers(catalog, promotions, variant.id).filter(
        (offer) => offer.kind === "sale",
      );
      const lines = [
        {
          variantId: variant.id,
          quantity: 1,
          listPrice: variant.listPrice,
          cashPrice: variant.cashPrice,
          available: variant.stock > 0,
        },
      ];
      const list = priceLines(lines, offers, "mercado-pago");
      const cash = priceLines(lines, offers, "transferencia");
      return {
        id: product.id,
        name,
        title:
          /whey/i.test(name) && /protein/i.test(name)
            ? ["Whey", "Protein"]
            : [name],
        brand:
          catalog.brands.find((brand) => brand.id === product.brandId)?.name ??
          "STYLO",
        description: [
          flavorLabel(variant.flavor),
          variant.size,
          packagingLabel(variant.presentation),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/producto/${product.slug}?variante=${variant.id}`,
        image: { src: photo.src, srcSet: photo.srcSet, alt: photo.alt || name },
        facts: [
          { label: "Mercado Pago", value: formatPrice(list.total, 0) },
          { label: "Con transferencia", value: formatPrice(cash.total, 0) },
          { label: "Contenido", value: variant.size || "Ver presentación" },
          {
            label: "Disponibilidad",
            value: variant.stock > 0 ? "Disponible" : "Sin stock",
          },
        ],
      };
    }
  }
  return null;
}
