"use client";
import { useCart } from "./cart-provider";
import { updateCartAndRedirect } from "@/modules/commerce/actions";
export function AddToCart({
  variantId,
  stock,
  slug,
}: {
  variantId: string;
  stock: number;
  slug: string;
}) {
  const { busy, error, preview, change } = useCart();
  return (
    <form
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
        {stock === 0 ? "Sin stock" : "Agregar al carrito"}
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
