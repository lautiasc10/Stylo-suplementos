"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatPrice } from "@/modules/catalog/model";
import { updateCartAndRedirect } from "@/modules/commerce/actions";
import { useCart } from "./cart-provider";

export function CartContents() {
  const { quote, preview, busy, error, change, closeCart } = useCart();
  const prefix = preview ? "/vista-previa" : "";
  return (
    <div className="cart-contents" aria-busy={busy}>
      {preview && (
        <p className="preview-notice">
          Carrito de prueba · No se realizan compras ni se reserva stock.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {quote.quantity === 0 ? (
        <div className="cart-empty">
          <h3>Tu próxima elección empieza acá.</h3>
          <p>Explorá el catálogo y elegí una presentación.</p>
          <Link
            href={preview ? prefix : "/catalogo"}
            className="button button-outline"
            onClick={closeCart}
          >
            Explorar productos
          </Link>
        </div>
      ) : (
        <>
          {!!quote.issues.length && (
            <div role="status" className="cart-notice">
              {quote.issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          )}
          <ul className="cart-lines">
            {quote.lines.map((line) => (
              <li
                key={line.variantId}
                className="cart-line"
                data-variant={line.variantId}
              >
                <div>
                  {line.slug ? (
                    <Link
                      href={`${prefix}/producto/${line.slug}?variante=${line.variantId}`}
                      onClick={closeCart}
                    >
                      {line.name}
                    </Link>
                  ) : (
                    <strong>{line.name}</strong>
                  )}
                  <p>{line.label}</p>
                  <p className="cart-sku">SKU {line.sku}</p>
                </div>
                <dl className="cart-line-prices">
                  <div>
                    <dt>Mercado Pago</dt>
                    <dd>{formatPrice(line.listPrice * line.quantity)}</dd>
                  </div>
                  <div>
                    <dt>Transferencia</dt>
                    <dd>{formatPrice(line.cashPrice * line.quantity)}</dd>
                  </div>
                </dl>
                {(quote.listPricing.discount > 0 ||
                  quote.cashPricing.discount > 0) && (
                  <p className="cart-price-note">
                    Importes antes de promociones. El ahorro está incluido en el
                    resumen.
                  </p>
                )}
                <div className="cart-line-actions">
                  <form
                    action={updateCartAndRedirect}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void change(line.variantId, "set", line.quantity - 1);
                    }}
                  >
                    <input
                      type="hidden"
                      name="variantId"
                      value={line.variantId}
                    />
                    <input type="hidden" name="operation" value="set" />
                    <input
                      type="hidden"
                      name="quantity"
                      value={line.quantity - 1}
                    />
                    <button
                      className="cart-step"
                      aria-label={`Reducir cantidad de ${line.name}`}
                      disabled={busy || line.quantity <= 1}
                    >
                      −
                    </button>
                  </form>
                  <span aria-label={`Cantidad: ${line.quantity}`}>
                    {line.quantity}
                  </span>
                  <form
                    action={updateCartAndRedirect}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void change(line.variantId, "set", line.quantity + 1);
                    }}
                  >
                    <input
                      type="hidden"
                      name="variantId"
                      value={line.variantId}
                    />
                    <input type="hidden" name="operation" value="set" />
                    <input
                      type="hidden"
                      name="quantity"
                      value={line.quantity + 1}
                    />
                    <button
                      className="cart-step"
                      aria-label={`Aumentar cantidad de ${line.name}`}
                      disabled={
                        busy ||
                        line.quantity >= line.stock ||
                        line.quantity >= 999
                      }
                    >
                      +
                    </button>
                  </form>
                  <form
                    action={updateCartAndRedirect}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void change(line.variantId, "remove");
                    }}
                  >
                    <input
                      type="hidden"
                      name="variantId"
                      value={line.variantId}
                    />
                    <input type="hidden" name="operation" value="remove" />
                    <button
                      className="text-link"
                      disabled={busy}
                      aria-label={`Quitar ${line.name}`}
                    >
                      Quitar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <aside className="cart-summary" aria-label="Resumen del carrito">
            <h2>Resumen de tu selección</h2>
            <dl>
              <div>
                <dt>Mercado Pago</dt>
                <dd>{formatPrice(quote.listPricing.total)}</dd>
              </div>
              <div>
                <dt>Transferencia</dt>
                <dd>{formatPrice(quote.cashPricing.total)}</dd>
              </div>
            </dl>
            <p>
              Precios según el medio de pago. Revisamos stock antes de
              confirmar.
            </p>
            {quote.listPricing.promotion && (
              <p className="cart-saving">
                Mercado Pago: {quote.listPricing.promotion} · Ahorro{" "}
                {formatPrice(quote.listPricing.discount)}
              </p>
            )}
            {quote.cashPricing.promotion && (
              <p className="cart-saving">
                Transferencia: {quote.cashPricing.promotion} · Ahorro{" "}
                {formatPrice(quote.cashPricing.discount)}
              </p>
            )}
            <p className="cart-help">
              Entrega a definir en el checkout. El carrito no reserva stock.
            </p>
            {quote.valid && (
              <Link
                className="button button-gold"
                href={`${prefix}/checkout`}
                onClick={closeCart}
              >
                Continuar al checkout
              </Link>
            )}
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
      <h1 className="cart-page-title">
        <Icon name="cart" /> Tu carrito
      </h1>
      <div className="cart-page">
        <CartContents />
      </div>
    </>
  );
}
