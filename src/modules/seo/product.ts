import {
  flavorLabel,
  packagingLabel,
  publicCatalog,
  variantImages,
  variantLabel,
  type Catalog,
  type Product,
  type Variant,
} from "@/modules/catalog/model";
import { normalizedPhotoProps } from "@/modules/catalog/normalized-media";
import { productOffers } from "@/modules/commerce/product-offers";
import { priceLines, type Promotion } from "@/modules/commerce/promotions";
import { absoluteHttpUrl, pageMetadata } from "./metadata";

const text = (value: string) => value.trim().replace(/\s+/g, " ");

export function productPath(product: Product) {
  return `/producto/${encodeURIComponent(product.slug)}`;
}

/** Facts only: no health, delivery, financing or certification claims. */
export function productDescription(product: Product, brand: string) {
  const description =
    text(product.seoDescription) ||
    text(product.description) ||
    `${packagingLabel(product.name)} de ${brand}. Consultá sus presentaciones, precios y disponibilidad en STYLO Suplementos.`;
  if (description.length <= 160) return description;
  const excerpt = description.slice(0, 157);
  const lastSpace = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, lastSpace > 100 ? lastSpace : 157)}…`;
}

function productPhotos(
  product: Product,
  variant: Variant,
  imageBase: string,
  siteUrl: URL,
) {
  if (!imageBase) return [];
  return variantImages(product, variant.id).flatMap((image) => {
    const source = `${imageBase}/${image.path}`;
    const normalized = normalizedPhotoProps(source, "detail", {
      path: image.path,
      imageBase,
    });
    const url = absoluteHttpUrl(normalized.src ?? source, siteUrl);
    return url ? [{ url, alt: image.alt || packagingLabel(product.name) }] : [];
  });
}

export function productMetadata({
  catalog,
  slug,
  selectedId,
  imageBase,
  siteUrl,
}: {
  catalog: Catalog;
  slug: string;
  selectedId?: string;
  imageBase: string;
  siteUrl: URL;
}) {
  const data = publicCatalog(catalog);
  const product = data.products.find((item) => item.slug === slug);
  if (!product)
    return {
      title: "Producto no encontrado",
      robots: { index: false, follow: false },
    };
  const brand = data.brands.find((item) => item.id === product.brandId)!;
  const variant =
    product.variants.find((item) => item.id === selectedId) ??
    product.variants[0];
  return pageMetadata({
    title: text(product.seoTitle) || packagingLabel(product.name),
    description: productDescription(product, brand.name),
    path: productPath(product),
    siteUrl,
    images: productPhotos(product, variant, imageBase, siteUrl),
  });
}

/** One stable document describes every public SKU, including after client-side
 * flavor selection. General photos may be shared; another flavor's photo may not. */
export function productStructuredData({
  catalog,
  slug,
  promotions,
  imageBase,
  siteUrl,
  now = Date.now(),
}: {
  catalog: Catalog;
  slug: string;
  promotions: Promotion[];
  imageBase: string;
  siteUrl: URL;
  now?: number;
}) {
  const data = publicCatalog(catalog);
  const product = data.products.find((item) => item.slug === slug);
  if (!product) return null;
  const url = new URL(productPath(product), siteUrl).href;
  const brand = {
    "@type": "Brand",
    name: data.brands.find((item) => item.id === product.brandId)!.name,
  };
  const description = productDescription(product, brand.name);
  const multiple = product.variants.length > 1;
  const category = data.categories
    .filter((item) => product.categoryIds.includes(item.id))
    .map((item) => item.name);
  const products = product.variants.map((variant) => {
    const variantUrl = new URL(url);
    variantUrl.searchParams.set("variante", variant.id);
    const photos = productPhotos(product, variant, imageBase, siteUrl);
    const offers = productOffers(data, promotions, variant.id, now).filter(
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
    return {
      "@type": "Product",
      "@id": `${variantUrl.href}#product`,
      name: `${packagingLabel(product.name)} · ${variantLabel(variant)}`,
      description,
      url: variantUrl.href,
      sku: variant.sku,
      brand,
      category,
      ...(photos.length ? { image: photos.map((photo) => photo.url) } : {}),
      ...(multiple ? { isVariantOf: { "@id": `${url}#product-group` } } : {}),
      ...(variant.size ? { size: variant.size } : {}),
      additionalProperty: [
        ...(variant.flavor
          ? [
              {
                "@type": "PropertyValue",
                name: "Sabor",
                value: flavorLabel(variant.flavor),
              },
            ]
          : []),
        ...(variant.presentation
          ? [
              {
                "@type": "PropertyValue",
                name: "Presentación",
                value: packagingLabel(variant.presentation),
              },
            ]
          : []),
      ],
      offers: (["transferencia", "mercado-pago"] as const).map((method) => {
        const pricing = priceLines(lines, offers, method, now);
        const promotion = offers.find(
          (offer) => offer.id === pricing.promotionId,
        );
        const payment =
          method === "transferencia" ? "transferencia" : "Mercado Pago";
        return {
          "@type": "Offer",
          "@id": `${variantUrl.href}#${method}`,
          url: variantUrl.href,
          name: `Precio por unidad con ${payment}`,
          price: (pricing.total / 100).toFixed(2),
          priceCurrency: "ARS",
          availability: `https://schema.org/${variant.stock > 0 ? "InStock" : "OutOfStock"}`,
          ...(promotion?.endsAt ? { validThrough: promotion.endsAt } : {}),
        };
      }),
    };
  });
  if (!multiple) return { "@context": "https://schema.org", ...products[0] };
  const variesBy = [
    ...(new Set(product.variants.map((variant) => variant.flavor)).size > 1
      ? [{ "@type": "DefinedTerm", name: "Sabor" }]
      : []),
    ...(new Set(product.variants.map((variant) => variant.size)).size > 1
      ? ["https://schema.org/size"]
      : []),
    ...(new Set(product.variants.map((variant) => variant.presentation)).size >
    1
      ? [{ "@type": "DefinedTerm", name: "Presentación" }]
      : []),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": `${url}#product-group`,
    productGroupID: product.id,
    name: packagingLabel(product.name),
    description,
    url,
    brand,
    category,
    ...(variesBy.length ? { variesBy } : {}),
    hasVariant: products,
  };
}
