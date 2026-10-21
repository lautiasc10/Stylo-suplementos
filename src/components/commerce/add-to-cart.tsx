"use client";
import { useEffect, useState } from "react";
import { useCart } from "./cart-provider";
import { updateCartAndRedirect } from "@/modules/commerce/actions";
import { Icon } from "@/components/ui/icon";
export function AddToCart({
  variantId,
  stock,
  slug,
  illustrated = false,
  compact = false,
  accessibleLabel,
  quantityControl = false,
  selectedQuantity,
  onQuantityChange,
  iconOnly = false,
}: {
  variantId: string;
  stock: number;
  slug: string;
  illustrated?: boolean;
  compact?: boolean;
  accessibleLabel?: string;
  quantityControl?: boolean;
  selectedQuantity?: number;
  onQuantityChange?: (quantity: number) => void;
  iconOnly?: boolean;
}) {
  const { busy, error, preview, change, quote } = useCart();
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState({ variantId, quantity: 1 });
  const [submitted, setSubmitted] = useState("");
  useEffect(() => setReady(true), []);
  const inCart =
    quote.lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
  const available = Math.max(0, stock - inCart);
  const quantity = Math.max(
    1,
    Math.min(
      available,
      selectedQuantity ??
        (selection.variantId === variantId ? selection.quantity : 1),
    ),
  );
  const update = (amount: number) => {
    const next = Math.max(1, Math.min(available, amount));
    if (onQuantityChange) onQuantityChange(next);
    else setSelection({ variantId, quantity: next });
  };
  return (
    <form
      className={`add-to-cart${quantityControl ? " product-purchase-form" : ""}`}
      action={updateCartAndRedirect}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(variantId);
        const origin = event.currentTarget
          .querySelector('button[type="submit"]')
          ?.getBoundingClientRect();
        void change(variantId, "add", quantityControl ? quantity : 1, origin);
      }}
    >
      <input type="hidden" name="variantId" value={variantId} />
      <input
        type="hidden"
        name="quantity"
        value={quantityControl ? quantity : 1}
      />
      <input type="hidden" name="operation" value="add" />
      <input type="hidden" name="returnTo" value={`/producto/${slug}`} />
      {quantityControl && (
        <div
          className="product-quantity"
          role="group"
          aria-label="Cantidad a agregar"
        >
          <button
            type="button"
            aria-label="Disminuir cantidad"
            disabled={!ready || busy || quantity <= 1 || !available}
            onClick={() => update(quantity - 1)}
          >
            −
          </button>
          <output aria-live="polite" aria-label="Cantidad a agregar">
            {quantity}
          </output>
          <button
            type="button"
            aria-label="Aumentar cantidad"
            disabled={!ready || busy || quantity >= available}
            onClick={() => update(quantity + 1)}
          >
            +
          </button>
        </div>
      )}
      <button
        type="submit"
        className={`button button-gold${quantityControl ? " premium-cta" : ""}`}
        disabled={busy || available === 0}
        aria-label={
          accessibleLabel && stock === 0
            ? `${accessibleLabel} (sin stock)`
            : accessibleLabel
        }
      >
        {iconOnly && <span aria-hidden="true">+</span>}
        {illustrated && <Icon name="cart" />}
        <span className={iconOnly ? "sr-only" : undefined}>
          {stock === 0
            ? "Sin stock"
            : quantityControl && available === 0
              ? "Todo el stock está en tu carrito"
              : compact
                ? "Agregar"
                : "Agregar al carrito"}
        </span>
        {illustrated && <Icon name="arrow" />}
      </button>
      {error && submitted === variantId && <p role="alert">{error}</p>}
      {preview && (
        <noscript>
          <p>El carrito de prueba requiere JavaScript.</p>
        </noscript>
      )}
    </form>
  );
}
