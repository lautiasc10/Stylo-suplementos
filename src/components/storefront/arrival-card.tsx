import Link from "next/link";
import { galleryPhotos } from "@/components/catalog/gallery-images";
import { flavorLabel, formatPrice, packagingLabel, type Catalog, type Product } from "@/modules/catalog/model";

export function ArrivalCard({ product, catalog, imageBase, example }: {
  product: Product;
  catalog: Catalog;
  imageBase: string;
  example: boolean;
}) {
  const variant = product.variants.find((item) => item.active && item.stock > 0) ?? product.variants[0];
  const brand = catalog.brands.find((item) => item.id === product.brandId);
  const photo = galleryPhotos(product, variant.id, imageBase, {}, "card")[0];
  const displayName = product.name.match(/["“]([^"”]+)["”]/)?.[1] ?? packagingLabel(product.name);
  return (
    <article className="arrival-card">
      <Link href={`/producto/${product.slug}?variante=${variant.id}`} aria-label={`Ver ${product.name}`}>
        <div className="arrival-card-image">
          <span className="arrival-card-badge">{example ? "Ejemplo" : "Nuevo"}</span>
          {photo && <img src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 960px) 280px, 76vw" width={600} height={600} loading="lazy" decoding="async" alt="" />}
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
