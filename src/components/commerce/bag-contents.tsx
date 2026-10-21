"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ProductThumbnail } from "@/components/ui/product-thumbnail";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import { formatPrice } from "@/modules/catalog/model";
import { useCart } from "./cart-provider";

/** Reference sheet presentation; all amounts and mutations come from STYLO. */
export function BagContents() {
  const {
    quote,
    preview,
    busy,
    error,
    change,
    closeCart,
    imageBase,
    imageUrls,
    paymentMethod,
    setPaymentMethod,
  } = useCart();
  const name = useId();
  const empty = useRef<HTMLHeadingElement>(null);
  const undo = useRef<HTMLButtonElement>(null);
  const [removed, setRemoved] = useState<{
    variantId: string;
    quantity: number;
    name: string;
  } | null>(null);
  const prefix = preview ? "/vista-previa" : "";
  const pricing =
    paymentMethod === "transferencia" ? quote.cashPricing : quote.listPricing;

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => {
      if (document.activeElement !== undo.current) setRemoved(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [removed]);

  return (
    <div className="bag-contents" aria-busy={busy}>
      <div className="bag-feedback">
        <p className="sr-only" role="status">
          {busy
            ? "Actualizando carrito…"
            : `${quote.quantity} unidades en el carrito.`}
        </p>
        {preview && (
          <p className="preview-notice">
            Carrito de prueba · No se realizan compras ni se reserva stock.
          </p>
        )}
        {error && (
          <p className="ui-notice" role="alert">
            {error}
          </p>
        )}
        {quote.issues.length > 0 && (
          <div className="ui-notice" role="status">
            {quote.issues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        )}
      </div>
      {quote.quantity === 0 ? (
        <div className="bag-empty">
          <Icon name="shoppingBag" />
          <h3 ref={empty} tabIndex={-1}>
            Tu carrito está vacío.
          </h3>
          <Link href={preview ? prefix : "/catalogo"} onClick={closeCart}>
            Ir a la tienda →
          </Link>
        </div>
      ) : (
        <>
          <ul className="bag-lines">
            {quote.lines.map((line) => {
              const unit =
                paymentMethod === "transferencia"
                  ? line.cashPrice
                  : line.listPrice;
              const source =
                line.image &&
                (imageUrls[line.image.path] ||
                  (imageBase
                    ? catalogMediaSource(
                        `${imageBase}/${line.image.path}`,
                        imageBase,
                        "thumbnail",
                      )
                    : undefined));
              const href = `${prefix}/producto/${line.slug}?variante=${line.variantId}`;
              return (
                <li
                  key={line.variantId}
                  className="bag-line"
                  data-variant={line.variantId}
                >
                  <Link
                    href={line.slug ? href : preview ? prefix : "/catalogo"}
                    className="bag-photo"
                    onClick={closeCart}
                    aria-label={`Ver ${line.name}, ${line.label}`}
                  >
                    <ProductThumbnail
                      src={source}
                      alt={line.image?.alt || line.name}
                      size={80}
                    />
                  </Link>
                  <div className="bag-line-copy">
                    <div className="bag-line-heading">
                      <div>
                        {line.brand && (
                          <p className="bag-brand">{line.brand}</p>
                        )}
                        {line.slug ? (
                          <Link
                            className="bag-name"
                            href={href}
                            onClick={closeCart}
                          >
                            {line.name}
                          </Link>
                        ) : (
                          <strong>{line.name}</strong>
                        )}
                      </div>
                      <button
                        type="button"
                        className="bag-remove"
                        disabled={busy}
                        aria-label={`Quitar ${line.name}`}
                        onClick={async () => {
                          if (await change(line.variantId, "remove")) {
                            setRemoved({
                              variantId: line.variantId,
                              quantity: line.quantity,
                              name: line.name,
                            });
                            requestAnimationFrame(() =>
                              (undo.current ?? empty.current)?.focus(),
                            );
                          }
                        }}
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                    <p className="cart-variant">{line.label}</p>
                    <div className="bag-line-bottom">
                      <div
                        className="bag-quantity"
                        role="group"
                        aria-label={`Cantidad de ${line.name}`}
                      >
                        <button
                          type="button"
                          disabled={busy || line.quantity <= 1}
                          aria-label={`Reducir cantidad de ${line.name}`}
                          onClick={() =>
                            void change(
                              line.variantId,
                              "set",
                              line.quantity - 1,
                            )
                          }
                        >
                          −
                        </button>
                        <span aria-label={`Cantidad: ${line.quantity}`}>
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={
                            busy ||
                            line.quantity >= line.stock ||
                            line.quantity >= 999
                          }
                          aria-label={`Aumentar cantidad de ${line.name}`}
                          onClick={() =>
                            void change(
                              line.variantId,
                              "set",
                              line.quantity + 1,
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <span className="bag-line-price">
                        {formatPrice(unit * line.quantity, 0)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="bag-summary" aria-label="Resumen del carrito">
            <fieldset className="bag-payment">
              <legend>Medio de pago</legend>
              {(
                [
                  ["transferencia", "Transferencia"],
                  ["mercado-pago", "Mercado Pago"],
                ] as const
              ).map(([method, label]) => (
                <label key={method}>
                  <input
                    type="radio"
                    name={name}
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(pricing.base, 0)}</dd>
              </div>
              {pricing.discount > 0 && (
                <div className="bag-discount">
                  <dt>Promoción aplicada</dt>
                  <dd>−{formatPrice(pricing.discount, 0)}</dd>
                </div>
              )}
              <div className="bag-total">
                <dt>Total</dt>
                <dd className="reference-gold-text">
                  {formatPrice(pricing.total, 0)}
                </dd>
              </div>
            </dl>
            {pricing.promotion && (
              <p className="bag-promotion">{pricing.promotion}</p>
            )}
            <p className="bag-delivery">Entrega a definir en el checkout.</p>
            {quote.valid ? (
              <Link
                className="bag-checkout premium-cta"
                href={`${prefix}/checkout`}
                onClick={closeCart}
              >
                Finalizar compra
              </Link>
            ) : (
              <p className="ui-notice">Revisá los productos para continuar.</p>
            )}
            <p className="bag-help">El carrito no reserva stock.</p>
          </div>
        </>
      )}
      {removed && (
        <div className="bag-undo" role="status">
          <span>Quitaste {removed.name}.</span>
          <button
            type="button"
            ref={undo}
            disabled={busy}
            onClick={async () => {
              if (await change(removed.variantId, "add", removed.quantity))
                setRemoved(null);
            }}
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}
