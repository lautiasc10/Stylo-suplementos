"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ProductThumbnail } from "@/components/ui/product-thumbnail";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import { formatPrice } from "@/modules/catalog/model";
import { updateCartAndRedirect } from "@/modules/commerce/actions";
import { useCart } from "./cart-provider";

export function CartContents() {
  const {
    quote,
    preview,
    busy,
    error,
    change,
    closeCart,
    imageBase,
    imageUrls,
  } = useCart();
  const [method, setMethod] = useState<"mercado-pago" | "transferencia">(
    "mercado-pago",
  );
  const radioName = useId();
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const root = useRef<HTMLDivElement>(null);
  const prefix = preview ? "/vista-previa" : "";
  const pricing =
    method === "mercado-pago" ? quote.listPricing : quote.cashPricing;
  const hasDiscount = pricing.discount > 0;
  return (
    <div className="cart-contents" ref={root}>
      <div className="cart-feedback">
        {preview && (
          <p className="preview-notice">
            Carrito de prueba · No se realizan compras ni se reserva stock.
          </p>
        )}
        <p className="sr-only" role="status">
          {busy
            ? "Actualizando carrito…"
            : `${quote.quantity} unidades en el carrito.`}
        </p>
        {error && (
          <p className="ui-notice" role="alert">
            {error}
          </p>
        )}
        {busy && (
          <p className="cart-loading" aria-hidden="true">
            Actualizando…
          </p>
        )}
      </div>
      {quote.quantity === 0 ? (
        <div className="cart-empty">
          <span className="empty-icon">
            <Icon name="cart" />
          </span>
          <h3 tabIndex={-1}>Tu próxima elección empieza acá.</h3>
          <p>Encontrá el producto que acompaña tu rutina.</p>
          <Link
            href={preview ? prefix : "/catalogo"}
            className="button button-gold"
            onClick={closeCart}
          >
            Explorar productos <Icon name="arrow" />
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-products" aria-busy={busy}>
            <fieldset className="cart-price-switch" disabled={!interactive}>
              <legend>Ver precios con</legend>
              {[
                ["mercado-pago", "Mercado Pago"],
                ["transferencia", "Transferencia"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={radioName}
                    checked={method === value}
                    onChange={() => setMethod(value as typeof method)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {!!quote.issues.length && (
              <div role="status" className="ui-notice">
                {quote.issues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </div>
            )}
            <ul className="cart-lines">
              {quote.lines.map((line) => {
                const unit =
                  method === "mercado-pago" ? line.listPrice : line.cashPrice;
                const image = line.image;
                const src = image
                  ? imageUrls[image.path] ||
                    (imageBase
                      ? catalogMediaSource(
                          `${imageBase}/${image.path}`,
                          imageBase,
                          "thumbnail",
                        )
                      : undefined)
                  : undefined;
                const href = `${prefix}/producto/${line.slug}?variante=${line.variantId}`;
                return (
                  <li
                    key={line.variantId}
                    className="cart-line"
                    data-variant={line.variantId}
                  >
                    {line.slug ? (
                      <Link
                        href={href}
                        onClick={closeCart}
                        className="cart-photo"
                        aria-label={`Ver ${line.name}, ${line.label}`}
                      >
                        <ProductThumbnail
                          src={src}
                          alt={image?.alt || `${line.name}, ${line.label}`}
                        />
                      </Link>
                    ) : (
                      <ProductThumbnail alt={line.name} />
                    )}
                    <div className="cart-line-body">
                      {line.brand && (
                        <span className="cart-brand">{line.brand}</span>
                      )}
                      {line.slug ? (
                        <Link
                          className="cart-product-name"
                          href={href}
                          onClick={closeCart}
                        >
                          {line.name}
                        </Link>
                      ) : (
                        <strong>{line.name}</strong>
                      )}
                      <p className="cart-variant">{line.label}</p>
                      <div className="cart-price-row">
                        <span className="cart-unit-price">
                          {formatPrice(unit)} <span>/ unidad</span>
                        </span>
                        <span className="cart-line-subtotal">
                          <span>Subtotal</span>
                          <strong>{formatPrice(unit * line.quantity)}</strong>
                        </span>
                      </div>
                      <div className="cart-line-actions">
                        <div
                          className="quantity-control"
                          aria-label={`Cantidad de ${line.name}`}
                        >
                          {([-1, 1] as const).map((delta) => (
                            <form
                              key={delta}
                              action={updateCartAndRedirect}
                              onSubmit={(event) => {
                                event.preventDefault();
                                void change(
                                  line.variantId,
                                  "set",
                                  line.quantity + delta,
                                );
                              }}
                            >
                              <input
                                type="hidden"
                                name="variantId"
                                value={line.variantId}
                              />
                              <input
                                type="hidden"
                                name="operation"
                                value="set"
                              />
                              <input
                                type="hidden"
                                name="quantity"
                                value={line.quantity + delta}
                              />
                              <button
                                className="cart-step"
                                aria-label={`${delta < 0 ? "Reducir" : "Aumentar"} cantidad de ${line.name}`}
                                disabled={
                                  busy ||
                                  (delta < 0
                                    ? line.quantity <= 1
                                    : line.quantity >= line.stock ||
                                      line.quantity >= 999)
                                }
                              >
                                {delta < 0 ? "−" : "+"}
                              </button>
                            </form>
                          ))}
                          <span aria-label={`Cantidad: ${line.quantity}`}>
                            {line.quantity}
                          </span>
                        </div>
                        <details className="cart-remove">
                          <summary aria-label={`Quitar ${line.name}`}>
                            Quitar
                          </summary>
                          <div className="cart-remove-confirm">
                            <p>¿Quitar este producto?</p>
                            <form
                              action={updateCartAndRedirect}
                              onSubmit={async (event) => {
                                event.preventDefault();
                                await change(line.variantId, "remove");
                                requestAnimationFrame(() => {
                                  if (
                                    !root.current?.querySelector(
                                      `[data-variant="${line.variantId}"]`,
                                    )
                                  )
                                    (
                                      root.current?.querySelector(
                                        ".cart-step:not(:disabled), .cart-empty h3",
                                      ) as HTMLElement | null
                                    )?.focus();
                                });
                              }}
                            >
                              <input
                                type="hidden"
                                name="variantId"
                                value={line.variantId}
                              />
                              <input
                                type="hidden"
                                name="operation"
                                value="remove"
                              />
                              <button
                                className="button button-destructive"
                                disabled={busy}
                              >
                                Confirmar eliminación
                              </button>
                            </form>
                            <button
                              type="button"
                              className="text-link"
                              onClick={(event) => {
                                const details =
                                  event.currentTarget.closest("details")!;
                                details.open = false;
                                details.querySelector("summary")?.focus();
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasDiscount && (
              <p className="cart-price-note">
                Los subtotales de cada producto son anteriores a promociones.
              </p>
            )}
            <Link
              className="text-link cart-continue"
              href={preview ? prefix : "/catalogo"}
              onClick={closeCart}
            >
              Seguir explorando <Icon name="arrow" />
            </Link>
          </div>
          <aside
            className="cart-summary"
            aria-label="Resumen del carrito"
            aria-busy={busy}
          >
            <div className="cart-summary-detail">
              <h2>Resumen del pedido</h2>
              <dl>
                <div>
                  <dt>Productos ({quote.quantity})</dt>
                  <dd>{formatPrice(pricing.base)}</dd>
                </div>
                {hasDiscount && (
                  <div className="cart-discount">
                    <dt>Promoción aplicada</dt>
                    <dd>−{formatPrice(pricing.discount)}</dd>
                  </div>
                )}
              </dl>
              {pricing.promotion && (
                <p className="cart-promotion-name">{pricing.promotion}</p>
              )}
              <p className="cart-delivery-note">
                Entrega a definir en el checkout.
              </p>
            </div>
            <div className="cart-checkout-action">
              <div className="cart-total">
                <span>
                  Total en productos
                  <small>
                    {method === "mercado-pago"
                      ? "Con Mercado Pago"
                      : "Con transferencia"}
                  </small>
                </span>
                <strong>{formatPrice(pricing.total)}</strong>
              </div>
              <p className="cart-alternative-price">
                {method === "mercado-pago"
                  ? `Con transferencia: ${formatPrice(quote.cashPricing.total)}`
                  : `Con Mercado Pago: ${formatPrice(quote.listPricing.total)}`}
              </p>
              {quote.valid ? (
                <Link
                  className="button button-gold"
                  href={`${prefix}/checkout`}
                  onClick={closeCart}
                >
                  Continuar al checkout <Icon name="arrow" />
                </Link>
              ) : (
                <p className="ui-notice">
                  Revisá los productos para continuar.
                </p>
              )}
              <p className="cart-help">El carrito no reserva stock.</p>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
export function CartPage() {
  return (
    <>
      <p className="eyebrow">TU SELECCIÓN</p>
      <h1 className="cart-page-title">Tu carrito</h1>
      <div className="cart-page">
        <CartContents />
      </div>
    </>
  );
}
