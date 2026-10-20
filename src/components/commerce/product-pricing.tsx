"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPrice,
  variantLabel,
  type Variant,
} from "@/modules/catalog/model";
import { productOffers } from "@/modules/commerce/product-offers";
import { priceLines } from "@/modules/commerce/promotions";
import { useCart } from "./cart-provider";
import { Icon } from "@/components/ui/icon";
import { Crossfade } from "@/components/ui/Crossfade";

function useOffers(variant: Variant) {
  const { catalog, promotions, preview } = useCart();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Refresh only when a scheduled offer changes, not on a continuous polling loop.
    const boundary = promotions
      .flatMap((p) => [p.startsAt, p.endsAt])
      .filter(Boolean)
      .map((d) => Date.parse(d!))
      .filter((t) => t > now)
      .sort((a, b) => a - b)[0];
    if (!boundary) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(boundary - Date.now() + 20, 2147483647),
    );
    return () => clearTimeout(timer);
  }, [promotions, now]);
  const offers = productOffers(catalog, promotions, variant.id, now);
  return { offers, now, preview };
}

export function ProductPromotionBadge({ variant }: { variant: Variant }) {
  const { offers } = useOffers(variant);
  if (!offers.length) return null;
  return (
    <span
      className="product-promotion-tag"
      title={offers.map((offer) => offer.name).join(" · ")}
    >
      <Icon name="bolt" />
      <span className="product-promotion-full">
        {offers.length > 1
          ? `${offers.length} promociones`
          : offers[0].kind === "quantity"
            ? `Promoción · Desde ${offers[0].components[0].quantity} unidades`
            : offers[0].kind === "bundle"
              ? "Promoción · Combo"
              : "Precio rebajado"}
      </span>
      <span className="product-promotion-compact" aria-hidden="true">
        {offers.length > 1
          ? `${offers.length} promociones`
          : offers[0].kind === "quantity"
            ? `Promo · ${offers[0].components[0].quantity}+ unidades`
            : offers[0].kind === "bundle"
              ? "Promo · Combo"
              : "Precio rebajado"}
      </span>
    </span>
  );
}

export function ProductPricing({
  variant,
  compact = false,
  animateChange = false,
  transferFirst = false,
  listFirst = false,
}: {
  variant: Variant;
  compact?: boolean;
  animateChange?: boolean;
  transferFirst?: boolean;
  listFirst?: boolean;
}) {
  const { offers, now, preview } = useOffers(variant);
  const lines = [
    {
      variantId: variant.id,
      quantity: 1,
      listPrice: variant.listPrice,
      cashPrice: variant.cashPrice,
      available: variant.stock > 0,
    },
  ];
  const sales = offers.filter((p) => p.kind === "sale");
  const list = priceLines(lines, sales, "mercado-pago", now),
    cash = priceLines(lines, sales, "transferencia", now);
  const prices = listFirst ? (
    <div className="transfer-pricing editorial-pricing" aria-label="Precios">
      <p className="editorial-pricing-list">
        <span className="sr-only">Precio de lista</span>
        {list.discount > 0 && <del>{formatPrice(variant.listPrice, 0)}</del>}
        <strong>{formatPrice(list.total, 0)}</strong>
      </p>
      <p className="editorial-pricing-transfer">
        {cash.discount > 0 && <del>{formatPrice(variant.cashPrice, 0)}</del>}
        <strong>{formatPrice(cash.total, 0)}</strong>
        <span>con transferencia</span>
        {list.total > cash.total && (
          <span className="transfer-saving">
            Ahorrás {formatPrice(list.total - cash.total, 0)}
          </span>
        )}
      </p>
    </div>
  ) : transferFirst ? (
    <div className="transfer-pricing">
      <p className="transfer-pricing-primary">
        {cash.discount > 0 && <del>{formatPrice(variant.cashPrice, 0)}</del>}
        <strong>{formatPrice(cash.total, 0)}</strong>
        <span>con transferencia</span>
      </p>
      <p className="transfer-pricing-secondary">
        <span>
          <span className="sr-only">Precio de lista </span>
          {list.discount > 0 && (
            <del>{formatPrice(variant.listPrice, 0)}</del>
          )}{" "}
          {formatPrice(list.total, 0)}
        </span>
        {list.total > cash.total && (
          <span className="transfer-saving">
            Ahorrás {formatPrice(list.total - cash.total, 0)}
          </span>
        )}
      </p>
    </div>
  ) : (
    <dl className="product-prices">
      <div>
        <dt className="sr-only">Precio de lista</dt>
        <dd>
          {list.discount > 0 && <del>{formatPrice(variant.listPrice, 0)}</del>}{" "}
          {formatPrice(list.total, 0)}
        </dd>
      </div>
      <div>
        <dt>Con transferencia</dt>
        <dd>
          {cash.discount > 0 && <del>{formatPrice(variant.cashPrice, 0)}</del>}{" "}
          {formatPrice(cash.total, 0)}
        </dd>
      </div>
    </dl>
  );
  return (
    <>
      {animateChange ? (
        <Crossfade valueKey={variant.id}>{prices}</Crossfade>
      ) : (
        prices
      )}
      {!compact && offers.length > 0 && (
        <section
          className="product-offers"
          aria-label="Promociones disponibles"
        >
          {offers.map((offer) => {
            const originalList =
              offer.kind === "bundle"
                ? offer.components.reduce(
                    (sum, component) =>
                      sum + component.variant!.listPrice * component.quantity,
                    0,
                  )
                : offer.components[0].variant!.listPrice;
            const originalCash =
              offer.kind === "bundle"
                ? offer.components.reduce(
                    (sum, component) =>
                      sum + component.variant!.cashPrice * component.quantity,
                    0,
                  )
                : offer.components[0].variant!.cashPrice;
            return (
              <div className="product-offer" key={offer.id}>
                <span className="offer-type">
                  {offer.kind === "bundle"
                    ? "COMBO"
                    : offer.kind === "quantity"
                      ? `DESDE ${offer.components[0].quantity} UNIDADES`
                      : "PRECIO REBAJADO"}
                </span>
                <h3>{offer.name}</h3>
                {offer.kind === "bundle" && (
                  <ul>
                    {offer.components.map((c) => (
                      <li key={c.variantId}>
                        {c.quantity} ×{" "}
                        <Link
                          href={`${preview ? "/vista-previa" : ""}/producto/${c.product!.slug}?variante=${c.variantId}`}
                        >
                          {c.product!.name} · {variantLabel(c.variant!)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {offer.kind !== "sale" && (
                  <dl>
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
                )}
                <p>
                  {offer.kind === "bundle"
                    ? "Precio por combo completo."
                    : offer.kind === "quantity"
                      ? "Precio por unidad al alcanzar la cantidad indicada."
                      : "Ya incluido en los precios mostrados."}
                </p>
              </div>
            );
          })}
          <p className="offer-rule">
            Se aplica automáticamente la promoción que más ahorre. No se
            acumulan.
          </p>
        </section>
      )}
    </>
  );
}
