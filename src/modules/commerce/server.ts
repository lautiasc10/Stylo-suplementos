import "server-only";
import { cookies } from "next/headers";
import { getCatalog } from "@/modules/catalog/server";
import { parseCart, quoteCart } from "./cart";
import { readPromotions } from "./promotions-server";

export const cartCookie = "stylo.cart.v1";
export async function readCartItems() {
  try {
    const source = (await cookies()).get(cartCookie)?.value;
    return source && source.length < 3500 ? parseCart(JSON.parse(source)) : [];
  } catch {
    return [];
  }
}
export async function readCart() {
  const { catalog, configured, error } = await getCatalog();
  const promotions = await readPromotions();
  const quote = quoteCart(
    catalog,
    await readCartItems(),
    promotions.state.promotions,
  );
  if (!configured || error || promotions.error) {
    quote.valid = false;
    quote.issues.push(
      "El catálogo no está disponible para actualizar el carrito.",
    );
  }
  return quote;
}
