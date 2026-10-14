"use client";
import { useCart } from "./cart-provider";
import { updateCartAndRedirect } from "@/modules/commerce/actions";
import { Icon } from "@/components/ui/icon";
export function AddToCart({
  variantId,
  stock,
  slug,
  illustrated = false,
}: {
  variantId: string;
  stock: number;
  slug: string;
  illustrated?: boolean;
}) {
  const { busy, error, preview, change } = useCart();
  return (
    <form
      className="add-to-cart"
      action={updateCartAndRedirect}
      onSubmit={(event) => {
        event.preventDefault();
        void change(variantId, "add");
      }}
    >
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="operation" value="add" />
      <input type="hidden" name="returnTo" value={`/producto/${slug}`} />
      <button className="button button-gold" disabled={busy || stock === 0}>
        {illustrated && <Icon name="cart" />}
        <span>{stock === 0 ? "Sin stock" : "Agregar al carrito"}</span>
        {illustrated && <Icon name="arrow" />}
      </button>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <noscript>
          <p>El carrito de prueba requiere JavaScript.</p>
        </noscript>
      )}
    </form>
  );
}
