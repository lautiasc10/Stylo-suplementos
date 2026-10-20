"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/components/commerce/cart-provider";
import { productOffers } from "@/modules/commerce/product-offers";
import {
  formatPrice,
  variantLabel,
  type Catalog,
} from "@/modules/catalog/model";
import { galleryPhotos } from "@/components/catalog/gallery-images";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import { Icon } from "@/components/ui/icon";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { SectionHeading } from "./section-heading";

export function HomePromotions({
  unavailable = false,
  imageBase = "",
  catalog,
}: {
  unavailable?: boolean;
  imageBase?: string;
  catalog: Catalog;
}) {
  const { promotions } = useCart();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const boundary = promotions
      .flatMap((p) => [p.startsAt, p.endsAt])
      .filter(Boolean)
      .map((d) => Date.parse(d!))
      .filter((t) => t > now)
      .sort((a, b) => a - b)[0];
    if (!boundary) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(0, boundary - Date.now() + 20), 2147483647),
    );
    return () => clearTimeout(timer);
  }, [promotions, now]);
  const offers = [
    ...new Map(
      promotions
        .flatMap((p) =>
          p.components[0]
            ? productOffers(catalog, [p], p.components[0].variantId, now)
            : [],
        )
        .map((p) => [p.id, p]),
    ).values(),
  ].slice(0, 3);
  return (
    <section
      id="promociones"
      className="home-collection home-promotions"
      aria-labelledby="promociones-title"
    >
      <div className="container">
        <SectionHeading
          id="promociones-title"
          title="Promociones"
          eyebrow="OPORTUNIDADES STYLO"
        />
        {offers.length ? (
          <RevealGroup
            className="home-offer-grid"
            data-count={offers.length}
            delay={0.16}
          >
            {offers.map((offer) => {
              const originalList =
                offer.kind === "bundle"
                  ? offer.components.reduce(
                      (sum, c) => sum + c.variant!.listPrice * c.quantity,
                      0,
                    )
                  : offer.components[0].variant!.listPrice;
              const originalCash =
                offer.kind === "bundle"
                  ? offer.components.reduce(
                      (sum, c) => sum + c.variant!.cashPrice * c.quantity,
                      0,
                    )
                  : offer.components[0].variant!.cashPrice;
              const first = offer.components[0];
              const image =
                offer.kind === "bundle" && offer.imagePath && imageBase
                  ? catalogMediaSource(
                      `${imageBase}/${offer.imagePath}`,
                      imageBase,
                      "card",
                    )
                  : (galleryPhotos(
                      first.product!,
                      first.variantId,
                      imageBase,
                      {},
                      "card",
                    )[0]?.src ??
                    (imageBase && first.product!.images[0]
                      ? catalogMediaSource(
                          `${imageBase}/${first.product!.images[0].path}`,
                          imageBase,
                          "card",
                        )
                      : undefined));
              return (
                <RevealItem as="article" className="home-offer" key={offer.id}>
                  <div className="home-offer-media">
                    {image ? (
                      <Image
                        src={image}
                        alt={
                          offer.kind === "bundle"
                            ? `Combo ${offer.name}`
                            : `Foto de ${first.product!.name}`
                        }
                        width={600}
                        height={600}
                        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                        unoptimized
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="home-offer-media-empty"
                        aria-hidden="true"
                      >
                        <Icon name="bolt" />
                      </span>
                    )}
                    <p className="eyebrow">
                      <Icon name="bolt" />
                      {offer.kind === "bundle"
                        ? "COMBO"
                        : offer.kind === "quantity"
                          ? `DESDE ${offer.components[0].quantity} UNIDADES`
                          : "PRECIO REBAJADO"}
                    </p>
                  </div>
                  <h3>{offer.name}</h3>
                  <ul>
                    {offer.components.map((c) => (
                      <li key={c.variantId}>
                        {c.quantity} × {c.product!.name} ·{" "}
                        {variantLabel(c.variant!)}
                      </li>
                    ))}
                  </ul>
                  <dl className="product-prices">
                    <div>
                      <dt className="sr-only">Precio de lista</dt>
                      <dd>
                        {originalList > offer.listPrice && (
                          <del>{formatPrice(originalList, 0)}</del>
                        )}{" "}
                        <strong>{formatPrice(offer.listPrice, 0)}</strong>
                      </dd>
                    </div>
                    <div>
                      <dt>Con transferencia</dt>
                      <dd>
                        {originalCash > offer.cashPrice && (
                          <del>{formatPrice(originalCash, 0)}</del>
                        )}{" "}
                        <strong>{formatPrice(offer.cashPrice, 0)}</strong>
                      </dd>
                    </div>
                  </dl>
                  <p className="home-offer-condition">
                    {offer.kind === "quantity"
                      ? "Precio por unidad al alcanzar la cantidad indicada."
                      : offer.kind === "bundle"
                        ? "Precio por combo completo."
                        : "Descuento incluido en el precio."}
                  </p>
                  <Link
                    className="text-link"
                    href={`/producto/${offer.components[0].product!.slug}?variante=${offer.components[0].variantId}`}
                  >
                    Ver promoción <Icon name="arrow" />
                  </Link>
                </RevealItem>
              );
            })}
          </RevealGroup>
        ) : (
          <Reveal className="home-collection-empty">
            <p>
              {unavailable
                ? "No pudimos cargar las promociones. Volvé a intentarlo en la tienda."
                : "Actualmente no hay promociones activas."}
            </p>
            <Link href="/catalogo" className="text-link">
              Ver productos <Icon name="arrow" />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}
