"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCatalog } from "@/modules/catalog/server";
import {
  changeCart,
  addCustomCombo,
  quoteCart,
  validateGuest,
  merchandiseTotal,
  type CartItem,
  type PaymentMethod,
} from "./cart";
import { cartCookie, readCart, readCartItems } from "./server";
import { readPromotions } from "./promotions-server";
import { validatePromotions, type PromotionState } from "./promotions";
import { inspectImage } from "@/modules/catalog/image";
import { requireAdmin } from "@/modules/admin/access";
import { revalidatePath } from "next/cache";
import { validateManualOrder, type ManualOrderInput } from "./orders";
import { addPromotionToCart } from "./promotion-cart";

async function writeCart(items: CartItem[]) {
  (await cookies()).set(cartCookie, JSON.stringify(items), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.APP_ENV !== "local",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function refreshCart() {
  return readCart();
}
export async function updateCart(form: FormData) {
  const { catalog, configured, error } = await getCatalog();
  const promotions = await readPromotions();
  const items = await readCartItems();
  if (!configured || error || promotions.error)
    return {
      quote: await readCart(),
      error: "El catálogo no está disponible. Intentá más tarde.",
    };
  const result = changeCart(
    catalog,
    items,
    String(form.get("variantId") ?? ""),
    String(form.get("operation") ?? ""),
    Number(form.get("quantity")),
  );
  if (!result.error) await writeCart(result.items);
  return {
    quote: quoteCart(catalog, result.items, promotions.state.promotions),
    error: result.error,
  };
}
export async function addPromotion(form: FormData) {
  const [{ catalog, configured, error }, promotions, items] = await Promise.all([
    getCatalog(),
    readPromotions(),
    readCartItems(),
  ]);
  if (!configured || error || promotions.error)
    return { quote: await readCart(), error: "El catálogo no está disponible. Intentá más tarde." };
  const result = addPromotionToCart(
    catalog,
    items,
    promotions.state.promotions,
    String(form.get("promotionId") ?? ""),
  );
  if (!result.error) await writeCart(result.items);
  return {
    quote: quoteCart(catalog, result.items, promotions.state.promotions),
    error: result.error,
  };
}

export async function addCustomComboAction(form: FormData) {
  const ids = form.getAll("variantId").map(String);
  const [{ catalog, configured, error }, promotions, items] = await Promise.all([
    getCatalog(),
    readPromotions(),
    readCartItems(),
  ]);
  if (!configured || error || promotions.error)
    return { quote: await readCart(), error: "El catálogo no está disponible. Intentá más tarde." };
  const result = addCustomCombo(
    catalog,
    items,
    ids.map((variantId) => ({ variantId, quantity: 1 })),
  );
  if (!result.error) await writeCart(result.items);
  return {
    quote: quoteCart(catalog, result.items, promotions.state.promotions),
    error: result.error,
  };
}

export async function addCustomComboAndRedirect(form: FormData) {
  const result = await addCustomComboAction(form);
  redirect(result.error ? "/carrito?error=carrito" : "/carrito");
}

export async function addPromotionAndRedirect(form: FormData) {
  const result = await addPromotion(form);
  redirect(result.error ? "/carrito?error=carrito" : "/carrito");
}
export async function updateCartAndRedirect(form: FormData) {
  const result = await updateCart(form);
  const target = String(form.get("returnTo") ?? "/carrito");
  const safe = /^\/producto\/[a-z0-9-]+$/.test(target) ? target : "/carrito";
  redirect(result.error ? `${safe}?error=carrito` : "/carrito");
}
export async function reviewCheckout(form: FormData) {
  const quote = await readCart();
  const input = Object.fromEntries(
    ["name", "email", "phone", "dni", "notes"].map((key) => [
      key,
      String(form.get(key) ?? "").trim(),
    ]),
  );
  const errors = validateGuest(input);
  const method = String(form.get("payment")) as PaymentMethod;
  if (!["mercado-pago", "transferencia"].includes(method))
    errors.push("Elegí un medio de pago válido.");
  if (!quote.valid)
    errors.push("Revisá los productos y las cantidades del carrito.");
  if (errors.length) return { errors, total: null, quote };
  // This review creates no order and stores no personal data while rules remain pending.
  return { errors: [], total: merchandiseTotal(quote, method), quote };
}
export async function reviewCheckoutAndRedirect(form: FormData) {
  await reviewCheckout(form);
  redirect("/checkout");
}
export async function savePromotions(state: PromotionState, image?: FormData) {
  const { client } = await requireAdmin();
  const { catalog, error } = await getCatalog();
  if (error) return { error: "No pudimos consultar las presentaciones." };
  if (
    !state ||
    !Number.isInteger(state.revision) ||
    state.revision < 0 ||
    JSON.stringify(state).length > 100000
  )
    return { error: "La configuración no es válida." };
  const errors = validatePromotions(state.promotions, catalog);
  if (errors.length) return { error: errors.join(" ") };
  if (state.promotions.some((promotion) => promotion.maxUses != null)) {
    const capabilities = await client.rpc("commerce_promotions");
    if (capabilities.error || capabilities.data?.limitsEnabled !== true)
      return { error: "Para usar cupos, primero aplicá la migración de promociones en Supabase." };
  }
  let uploadedPath: string | undefined;
  if (image) {
    const file = image.get("file");
    const promotionId = String(image.get("promotionId") ?? "");
    const promotion = state.promotions.find((item) => item.id === promotionId);
    if (!(file instanceof File) || !promotion || promotion.kind !== "bundle")
      return { error: "Elegí un combo y una imagen válida." };
    try {
      const inspected = await inspectImage(file);
      uploadedPath = `promotions/${promotionId}/${crypto.randomUUID()}.${inspected.extension}`;
      const uploaded = await client.storage
        .from("product-media")
        .upload(uploadedPath, inspected.bytes, {
          contentType: inspected.mime,
          upsert: false,
        });
      if (uploaded.error)
        return { error: "No pudimos subir la foto del combo." };
      state = {
        ...state,
        promotions: state.promotions.map((item) =>
          item.id === promotionId ? { ...item, imagePath: uploadedPath } : item,
        ),
      };
    } catch {
      return { error: "La foto debe ser JPEG, PNG o WebP de hasta 5 MB." };
    }
  }
  const result = await client.rpc("save_commerce_promotions", {
    payload: state.promotions,
    expected_revision: state.revision,
  });
  if (result.error) {
    if (uploadedPath)
      await client.storage.from("product-media").remove([uploadedPath]);
    return {
      error:
        result.error.code === "40001"
          ? "Las promociones cambiaron en otra sesión. Recargá antes de guardar."
          : "No pudimos guardar las promociones.",
    };
  }
  revalidatePath("/", "layout");
  const refreshed = await client.rpc("commerce_promotions");
  return {
    state: refreshed.error || !refreshed.data
      ? { ...state, revision: result.data as number }
      : (refreshed.data as PromotionState),
  };
}
export async function createManualOrder(input: ManualOrderInput) {
  const { client } = await requireAdmin();
  const invalid = validateManualOrder(input);
  if (invalid) return { error: invalid };
  const result = await client.rpc(
    input.kind === "cash-sale"
      ? "create_manual_cash_sale"
      : "create_manual_pickup_order",
    {
      request_id: input.requestId,
      items: input.items,
      customer: input.customer,
      ...(input.kind === "cash-sale"
        ? { received: input.received === true }
        : {}),
    },
  );
  if (result.error)
    return {
      error:
        result.error.code === "40001"
          ? "Ese intento ya se usó para otro pedido. Revisá el listado."
          : "No pudimos crear el pedido. Revisá stock y configuración.",
    };
  revalidatePath("/admin/pedidos");
  if (input.kind === "cash-sale") revalidatePath("/", "layout");
  return { order: result.data as { id: string; snapshot: { total: number } } };
}
