"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ProductThumbnail } from "@/components/ui/product-thumbnail";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import { formatPrice } from "@/modules/catalog/model";
import { updateCartAndRedirect } from "@/modules/commerce/actions";
import { useCart } from "./cart-provider";

export function CartContents({ compact = false }: { compact?: boolean }) {
  const {
    quote,
    preview,
    busy,
    error,
    change,
    closeCart,
    imageBase,
    imageUrls,
    suggestions,
    paymentMethod: method,
    setPaymentMethod: setMethod,
  } = useCart();
  const radioName = useId();
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const root = useRef<HTMLDivElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const [removed, setRemoved] = useState<{ variantId: string; quantity: number; name: string } | null>(null);
  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => setRemoved(null), 8000);
    return () => window.clearTimeout(timer);
  }, [removed]);
  const prefix = preview ? "/vista-previa" : "";
  const pricing =
    method === "mercado-pago" ? quote.listPricing : quote.cashPricing;
  const hasDiscount = pricing.discount > 0;
  const suggestion = suggestions.find((item) =>
    !quote.lines.some((line) => line.variantId === item.variantId),
  );
  const suggestionImage = suggestion?.image;
  const suggestionSrc = suggestionImage
    ? imageUrls[suggestionImage.path] ||
      (imageBase
        ? catalogMediaSource(
            `${imageBase}/${suggestionImage.path}`,
            imageBase,
            "thumbnail",
          )
        : undefined)
    : undefined;
  const transferSaving = Math.max(0, quote.listPricing.total - quote.cashPricing.total);
  return (
    <div className="cart-contents" ref={root} data-compact={compact}>
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
                          {formatPrice(unit, 0)} <span>/ unidad</span>
                        </span>
                        <span className="cart-line-subtotal">
                          <span>Subtotal</span>
                          <strong>{formatPrice(unit * line.quantity, 0)}</strong>
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
                        <form
                          className="cart-remove"
                          action={updateCartAndRedirect}
                          onSubmit={async (event) => {
                            event.preventDefault();
                            const succeeded = await change(line.variantId, "remove");
                            if (succeeded) {
                              setRemoved({ variantId: line.variantId, quantity: line.quantity, name: line.name });
                              requestAnimationFrame(() => undoButton.current?.focus());
                            }
                          }}
                        >
                          <input type="hidden" name="variantId" value={line.variantId} />
                          <input type="hidden" name="operation" value="remove" />
                          <input type="hidden" name="quantity" value="1" />
                          <button className="cart-remove-button" aria-label={`Quitar ${line.name}`} disabled={busy}>
                            <Icon name="trash" />
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {suggestion && (
              <div className="cart-suggestion">
                <ProductThumbnail
                  src={suggestionSrc}
                  alt={suggestionImage?.alt || suggestion.name}
                  size={56}
                />
                <p>
                  <span>Completá tu rutina</span>
                  <strong>{suggestion.name}</strong>
                  <small>{formatPrice(method === "mercado-pago" ? suggestion.listPrice : suggestion.cashPrice, 0)}</small>
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void change(suggestion.variantId, "add")}
                >
                  Agregar
                </button>
              </div>
            )}
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
            <fieldset className="cart-price-switch" disabled={!interactive}>
              <legend>Ver precios con</legend>
              {([
                ["transferencia", "Transferencia", quote.cashPricing.total],
                ["mercado-pago", "Mercado Pago", quote.listPricing.total],
              ] as const).map(([value, label, total]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={radioName}
                    value={value}
                    checked={method === value}
                    onChange={() => setMethod(value)}
                  />
                  <span>
                    <span className="cart-price-label">{label}</span>
                    <strong>{formatPrice(total, 0)}</strong>
                    {value === "transferencia" && transferSaving > 0 && (
                      <small>Ahorrás {formatPrice(transferSaving, 0)}</small>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
            <details className="cart-summary-detail">
              <summary>Ver detalle del precio</summary>
              <div className="cart-summary-breakdown">
                <dl>
                  <div>
                    <dt>Productos ({quote.quantity})</dt>
                    <dd>{formatPrice(pricing.base, 0)}</dd>
                  </div>
                  {hasDiscount && (
                    <div className="cart-discount">
                      <dt>Promoción aplicada</dt>
                      <dd>−{formatPrice(pricing.discount, 0)}</dd>
                    </div>
                  )}
                </dl>
                {pricing.promotion && (
                  <p className="cart-promotion-name">{pricing.promotion}</p>
                )}
                <p className="cart-delivery-note">Entrega a definir en el checkout.</p>
              </div>
            </details>
            <div className="cart-checkout-action">
              {quote.valid ? (
                <Link
                  className="button button-gold"
                  href={`${prefix}/checkout`}
                  onClick={closeCart}
                >
                  Continuar al checkout · {formatPrice(pricing.total, 0)} <Icon name="arrow" />
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
      {removed && (
        <div className="cart-undo" role="status">
          <span>Quitaste {removed.name}.</span>
          <button
            ref={undoButton}
            type="button"
            disabled={busy}
            onClick={async () => {
              if (await change(removed.variantId, "add", removed.quantity)) setRemoved(null);
            }}
          >
            Deshacer
          </button>
        </div>
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
