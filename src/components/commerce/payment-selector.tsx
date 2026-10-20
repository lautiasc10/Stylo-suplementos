"use client";

import { useEffect, useId, useState } from "react";
import { useCart } from "./cart-provider";

export function PaymentSelector({
  label = "Ver precios con",
}: {
  label?: string;
}) {
  const { paymentMethod, setPaymentMethod } = useCart();
  const name = useId();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <fieldset
      className="offer-payment"
      data-method={paymentMethod}
      disabled={!ready}
    >
      <legend className="sr-only">{label}</legend>
      <span className="offer-payment-indicator" aria-hidden="true" />
      {(
        [
          ["transferencia", "Transferencia"],
          ["mercado-pago", "Mercado Pago"],
        ] as const
      ).map(([value, text]) => (
        <label key={value}>
          <input
            type="radio"
            name={name}
            value={value}
            checked={paymentMethod === value}
            onChange={() => setPaymentMethod(value)}
          />
          <span>{text}</span>
        </label>
      ))}
    </fieldset>
  );
}
