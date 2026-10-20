"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPrice,
  packagingLabel,
  variantLabel,
  type Variant,
} from "@/modules/catalog/model";
import { productOffers } from "@/modules/commerce/product-offers";
import { priceLines } from "@/modules/commerce/promotions";
import { useCart } from "./cart-provider";
import { Icon } from "@/components/ui/icon";
import { Crossfade } from "@/components/ui/Crossfade";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { PaymentSelector } from "./payment-selector";
import { addPromotionAndRedirect } from "@/modules/commerce/actions";

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

function ProductOfferDetails({
  offers,
  appliedId,
  preview,
}: {
  offers: ReturnType<typeof productOffers>;
  appliedId?: string | null;
  preview: boolean;
}) {
  const { paymentMethod, addPromotion, openCart, busy, error } = useCart();
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const method =
    paymentMethod === "mercado-pago" ? "Mercado Pago" : "transferencia";
  return (
    <section
      className="product-offers product-offers-simple"
      aria-label="Promociones disponibles"
    >
      {offers.map((offer) => {
        if (offer.kind === "sale" && offer.id === appliedId) {
          return (
            <p className="product-offer-applied" key={offer.id}>
              <Icon name="bolt" /> Precio promocional aplicado
            </p>
          );
        }
        const bundle = offer.kind === "bundle";
        const minimum = offer.components[0].quantity;
        const amount =
          paymentMethod === "mercado-pago" ? offer.listPrice : offer.cashPrice;
        return (
          <details className="product-offer-details" key={offer.id}>
            <summary>
              <Icon name="bolt" />
              <span>
                {bundle
                  ? "Combo disponible"
                  : offer.kind === "quantity"
                    ? `Desde ${minimum} unidades`
                    : "Oferta disponible"}
                : {offer.name}
              </span>
              <span className="product-offer-expand" aria-hidden="true" />
            </summary>
            <div className="product-offer-content">
              {bundle ? (
                <ul>
                  {offer.components.map((component) => (
                    <li key={component.variantId}>
                      {component.quantity} ×{" "}
                      <Link
                        href={`${preview ? "/vista-previa" : ""}/producto/${component.product!.slug}?variante=${component.variantId}`}
                      >
                        {packagingLabel(component.product!.name)} ·{" "}
                        {variantLabel(component.variant!)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : offer.kind === "quantity" ? (
                <p>Agregá al menos {minimum} unidades de esta presentación.</p>
              ) : null}
              <p className="product-offer-total">
                <span>
                  {bundle ? "Total del combo" : "Precio por unidad"} con{" "}
                  {method}
                </span>
                <strong>{formatPrice(amount, 0)}</strong>
              </p>
              {bundle ? (
                <form
                  action={addPromotionAndRedirect}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (adding || busy) return;
                    setFailed("");
                    setAdding(true);
                    try {
                      if (await addPromotion(offer.id)) openCart();
                      else setFailed(offer.id);
                    } finally {
                      setAdding(false);
                    }
                  }}
                >
                  <input type="hidden" name="promotionId" value={offer.id} />
                  <button
                    type="submit"
                    className="button button-outline"
                    disabled={busy || (preview && !ready)}
                    aria-busy={adding}
                  >
                    {adding ? "Agregando combo…" : "Agregar combo completo"}
                  </button>
                  {failed === offer.id && error && <p role="alert">{error}</p>}
                </form>
              ) : (
                <p className="product-offer-condition">
                  El descuento se aplica en el carrito si se cumplen las
                  condiciones y queda cupo.
                </p>
              )}
            </div>
          </details>
        );
      })}
    </section>
  );
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
  selectable = false,
  quantity = 1,
}: {
  variant: Variant;
  compact?: boolean;
  animateChange?: boolean;
  transferFirst?: boolean;
  listFirst?: boolean;
  selectable?: boolean;
  quantity?: number;
}) {
  const { offers, now, preview } = useOffers(variant);
  const { paymentMethod } = useCart();
  const lines = [
    {
      variantId: variant.id,
      quantity,
      listPrice: variant.listPrice,
      cashPrice: variant.cashPrice,
      available: variant.stock > 0,
    },
  ];
  const sales = offers.filter((p) => p.kind === "sale");
  const eligible = selectable
    ? offers.filter((offer) => offer.kind !== "bundle")
    : sales;
  const listQuote = priceLines(lines, eligible, "mercado-pago", now);
  const cashQuote = priceLines(lines, eligible, "transferencia", now);
  // The main price remains per unit, as in the reference. Quantity thresholds
  // and caps are evaluated using the selected quantity and units already in cart.
  const list = {
    ...listQuote,
    total: listQuote.total / quantity,
    discount: listQuote.discount / quantity,
  };
  const cash = {
    ...cashQuote,
    total: cashQuote.total / quantity,
    discount: cashQuote.discount / quantity,
  };
  const selected = paymentMethod === "mercado-pago" ? list : cash;
  const original =
    paymentMethod === "mercado-pago" ? variant.listPrice : variant.cashPrice;
  const saving = Math.max(0, original - selected.total);
  const prices = selectable ? (
    <div
      className="transfer-pricing product-payment-prices"
      aria-label="Precios"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="product-price-label">
        Precio por unidad con{" "}
        {paymentMethod === "mercado-pago" ? "Mercado Pago" : "transferencia"}
      </p>
      <p
        className={`product-price-main ${paymentMethod === "mercado-pago" ? "editorial-pricing-list" : "editorial-pricing-transfer"}`}
      >
        <strong>
          <AnimatedAmount value={selected.total} resetKey={variant.id} />
        </strong>
        {saving > 0 && (
          <del aria-label={`Antes ${formatPrice(original, 0)}`}>
            <AnimatedAmount value={original} resetKey={variant.id} />
          </del>
        )}
      </p>
    </div>
  ) : listFirst ? (
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
      {selectable && <PaymentSelector />}
      {animateChange ? (
        <Crossfade valueKey={variant.id}>{prices}</Crossfade>
      ) : (
        prices
      )}
      {!compact && selectable && offers.length > 0 && (
        <ProductOfferDetails
          offers={offers}
          appliedId={selected.promotionId}
          preview={preview}
        />
      )}
      {!compact && !selectable && offers.length > 0 && (
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
                <div className="product-offer-heading">
                  {selectable && <Icon name="bolt" />}
                  <span className="offer-type">
                    {offer.kind === "bundle"
                      ? "COMBO"
                      : offer.kind === "quantity"
                        ? `DESDE ${offer.components[0].quantity} UNIDADES`
                        : "PRECIO REBAJADO"}
                  </span>
                  <h3>{offer.name}</h3>
                </div>
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
                      : selectable
                        ? list.promotionId === offer.id ||
                          cash.promotionId === offer.id
                          ? "Ya incluido en los precios mostrados. Se aplica automáticamente la promoción que más ahorre; no se acumulan."
                          : "Se muestran los precios habituales para esta cantidad. El carrito aplica la promoción vigente que más ahorre; no se acumulan."
                        : "Ya incluido en los precios mostrados."}
                </p>
              </div>
            );
          })}
          {!(
            selectable &&
            offers.length === 1 &&
            offers[0].kind === "sale"
          ) && (
            <p className="offer-rule">
              Se aplica automáticamente la promoción que más ahorre. No se
              acumulan.
            </p>
          )}
        </section>
      )}
    </>
  );
}
