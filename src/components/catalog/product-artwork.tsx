import Image from "next/image";
import type { GalleryImage } from "./product-gallery";

/** The reflection shares the original URL and remains decorative for assistive technology. */
export function ProductArtwork({ photo, alt, sizes = "(max-width: 700px) 78vw, 370px", priority = false, className = "" }: {
  photo: Pick<GalleryImage, "src" | "alt">;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return <span className={`product-artwork ${className}`}>
    <Image className="product-artwork-front" src={photo.src} alt={alt ?? photo.alt} width={600} height={600} sizes={sizes} unoptimized priority={priority} />
    <Image className="product-artwork-reflection" src={photo.src} alt="" aria-hidden="true" width={600} height={600} sizes={sizes} unoptimized loading="lazy" />
  </span>;
}
