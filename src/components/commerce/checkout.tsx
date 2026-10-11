"use client";
import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/modules/catalog/model";
import {
  merchandiseTotal,
  quoteCart,
  parseCart,
  validateGuest,
  type PaymentMethod,
} from "@/modules/commerce/cart";
import {
  reviewCheckout,
  reviewCheckoutAndRedirect,
} from "@/modules/commerce/actions";
import { useCart, previewCatalog, previewPromotions } from "./cart-provider";

export function Checkout() {
  const { quote, preview, updateQuote } = useCart();
  const [payment, setPayment] = useState<PaymentMethod>("mercado-pago");
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  if (!quote.valid)
    return (
      <>
        <h1>Checkout</h1>
        <p>Revisá el carrito antes de continuar.</p>
        <Link
          className="button button-outline"
          href={preview ? "/vista-previa/carrito" : "/carrito"}
        >
          Volver al carrito
        </Link>
      </>
    );
  return (
    <>
      <p className="eyebrow">COMPRA COMO INVITADO</p>
      <h1>Tu selección, en detalle.</h1>
      <p>No necesitás crear una cuenta.</p>
      {preview && (
        <p className="preview-notice">
          Checkout de prueba · Usá datos ficticios. No se crean pedidos ni se
          cobra.
        </p>
      )}
      <div className="checkout-layout">
        <form
          action={reviewCheckoutAndRedirect}
          method="post"
          className="checkout-form"
          onChange={() => setReviewed(null)}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setBusy(true);
            setErrors([]);
            setReviewed(null);
            try {
              if (preview) {
                const input = Object.fromEntries(
                  ["name", "email", "phone", "dni", "notes"].map((key) => [
                    key,
                    String(form.get(key) ?? "").trim(),
                  ]),
                );
                const problems = validateGuest(input);
                const current = quoteCart(
                  previewCatalog(),
                  parseCart(
                    JSON.parse(
                      localStorage.getItem("stylo.cart-preview.v1") ?? "[]",
                    ),
                  ),
                  previewPromotions(),
                );
                if (!current.valid)
                  problems.push(
                    "Los productos o el stock cambiaron. Revisá el carrito.",
                  );
                setErrors(problems);
                updateQuote(current);
                if (!problems.length)
                  setReviewed(merchandiseTotal(current, payment));
              } else {
                const result = await reviewCheckout(form);
                setErrors(result.errors);
                updateQuote(result.quote);
                setReviewed(result.total);
              }
            } catch {
              setErrors(["No pudimos revisar el carrito. Intentá otra vez."]);
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset>
            <legend>01 · Tus datos</legend>
            <div className="checkout-fields">
              <label>
                Nombre y apellido
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Correo electrónico
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
              <label>
                Teléfono / WhatsApp
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  required
                />
              </label>
              <label>
                DNI
                <input
                  name="dni"
                  inputMode="numeric"
                  pattern="[0-9]{7,8}"
                  maxLength={8}
                  required
                />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>02 · Medio de pago</legend>
            {(
              [
                ["mercado-pago", "Mercado Pago · precio de lista"],
                ["transferencia", "Transferencia · precio por transferencia"],
              ] as const
            ).map(([value, label]) => (
              <label className="checkout-choice" key={value}>
                <input
                  type="radio"
                  name="payment"
                  value={value}
                  checked={payment === value}
                  onChange={() => setPayment(value)}
                />
                {label}
              </label>
            ))}
            <p>
              Esta revisión muestra el precio correspondiente. Los pagos se
              habilitarán al conectar y verificar los medios de cobro.
            </p>
          </fieldset>
          <fieldset>
            <legend>03 · Entrega</legend>
            <p>
              Las modalidades y sus costos están pendientes de configuración. No
              se incluye ni se confirma un envío en esta revisión.
            </p>
            <label>
              Notas adicionales (opcional)
              <textarea name="notes" maxLength={500} />
            </label>
          </fieldset>
          <p>
            Tus datos no se guardan ni se envían para marketing en esta
            revisión.
          </p>
          {!!errors.length && (
            <div role="alert">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
          <button className="button button-gold" disabled={busy}>
            {busy ? "Revisando…" : "Revisar selección"}
          </button>
          {reviewed !== null && (
            <p role="status">
              Selección revisada: {formatPrice(reviewed)} en productos. No se
              creó un pedido. Falta habilitar pago y entrega.
            </p>
          )}
          <noscript>
            <p>
              La revisión de datos requiere JavaScript. Podés seguir usando el
              carrito y el catálogo.
            </p>
          </noscript>
        </form>
        <aside className="checkout-summary" aria-label="Resumen de compra">
          <h2>Tu selección</h2>
          <ul>
            {quote.lines.map((line) => (
              <li key={line.variantId}>
                <strong>{line.name}</strong>
                <p>
                  {line.label} × {line.quantity}
                </p>
                <span>
                  {formatPrice(
                    (payment === "mercado-pago"
                      ? line.listPrice
                      : line.cashPrice) * line.quantity,
                  )}
                </span>
              </li>
            ))}
          </ul>
          {(payment === "mercado-pago" ? quote.listPricing : quote.cashPricing)
            .discount > 0 && (
            <p className="checkout-discount">
              {
                (payment === "mercado-pago"
                  ? quote.listPricing
                  : quote.cashPricing
                ).promotion
              }
              : −
              {formatPrice(
                (payment === "mercado-pago"
                  ? quote.listPricing
                  : quote.cashPricing
                ).discount,
              )}
            </p>
          )}
          <p>Subtotal de productos</p>
          <p className="checkout-total" aria-live="polite">
            {formatPrice(merchandiseTotal(quote, payment))}
          </p>
          <p>Entrega: pendiente de definición.</p>
          <p>No se reserva stock al agregar al carrito.</p>
          <Link
            className="text-link"
            href={preview ? "/vista-previa/carrito" : "/carrito"}
          >
            Editar carrito
          </Link>
        </aside>
      </div>
    </>
  );
}
