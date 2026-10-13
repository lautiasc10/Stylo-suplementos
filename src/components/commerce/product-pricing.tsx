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

export function ProductPricing({ variant }: { variant: Variant }) {
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
  return (
    <>
      <dl className="product-prices">
        <div>
          <dt>Precio de lista</dt>
          <dd>
            {list.discount > 0 && (
              <del>{formatPrice(variant.listPrice, 0)}</del>
            )}{" "}
            {formatPrice(list.total, 0)}
          </dd>
        </div>
        <div>
          <dt>Transferencia</dt>
          <dd>
            {cash.discount > 0 && (
              <del>{formatPrice(variant.cashPrice, 0)}</del>
            )}{" "}
            {formatPrice(cash.total, 0)}
          </dd>
        </div>
      </dl>
      {offers.length > 0 && (
        <section
          className="product-offers"
          aria-label="Promociones disponibles"
        >
          {offers.map((offer) => (
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
                    <dt>Precio de lista</dt>
                    <dd>{formatPrice(offer.listPrice, 0)}</dd>
                  </div>
                  <div>
                    <dt>Transferencia</dt>
                    <dd>{formatPrice(offer.cashPrice, 0)}</dd>
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
          ))}
          <p className="offer-rule">
            Se aplica automáticamente la promoción que más ahorre. No se
            acumulan.
          </p>
        </section>
      )}
    </>
  );
}
