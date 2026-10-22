import Link from "next/link";
import { ProductArtwork } from "@/components/catalog/product-artwork";
import { galleryPhotos } from "@/components/catalog/gallery-images";
import { flavorLabel, formatPrice, packagingLabel, type Catalog, type Product } from "@/modules/catalog/model";

export function ArrivalCard({ product, catalog, imageBase, example, imageUrls = {}, prefix = "" }: {
  product: Product;
  catalog: Catalog;
  imageBase: string;
  example: boolean;
  imageUrls?: Record<string, string>;
  prefix?: string;
}) {
  const variant = product.variants.find((item) => item.active && item.stock > 0) ?? product.variants[0];
  const brand = catalog.brands.find((item) => item.id === product.brandId);
  const photo = galleryPhotos(product, variant.id, imageBase, imageUrls, "card")[0];
  const displayName = product.name.match(/["“]([^"”]+)["”]/)?.[1] ?? packagingLabel(product.name);
  return (
    <article className="arrival-card">
      <Link href={`${prefix}/producto/${product.slug}?variante=${variant.id}`} aria-label={`Ver ${product.name}`}>
        <div className="arrival-card-image product-reflection-stage">
          <span className="arrival-card-badge">{example ? "Ejemplo" : "Nuevo"}</span>
          {photo && <ProductArtwork photo={photo} alt="" sizes="(min-width: 960px) 320px, 76vw" />}
        </div>
        <div className="arrival-card-info">
          <span>{brand?.name ?? "STYLO"}</span>
          <h3>{displayName}</h3>
          <p>{[flavorLabel(variant.flavor), variant.size].filter(Boolean).join(" · ")}</p>
          <strong>{formatPrice(variant.listPrice, 0)}</strong>
        </div>
      </Link>
    </article>
  );
}
