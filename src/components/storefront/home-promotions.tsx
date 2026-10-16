"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/commerce/cart-provider";
import { productOffers } from "@/modules/commerce/product-offers";
import { formatPrice, variantLabel } from "@/modules/catalog/model";
import { Icon } from "@/components/ui/icon";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { SectionHeading } from "./section-heading";

export function HomePromotions({
  unavailable = false,
}: {
  unavailable?: boolean;
}) {
  const { catalog, promotions } = useCart();
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
          <RevealGroup className="home-offer-grid">
            {offers.map((offer) => (
              <RevealItem as="article" className="home-offer" key={offer.id}>
                <p className="eyebrow">
                  <Icon name="bolt" />
                  {offer.kind === "bundle"
                    ? "COMBO"
                    : offer.kind === "quantity"
                      ? `DESDE ${offer.components[0].quantity} UNIDADES`
                      : "PRECIO REBAJADO"}
                </p>
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
                    <dt>Precio de lista</dt>
                    <dd>{formatPrice(offer.listPrice, 0)}</dd>
                  </div>
                  <div>
                    <dt>Transferencia</dt>
                    <dd>{formatPrice(offer.cashPrice, 0)}</dd>
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
            ))}
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
