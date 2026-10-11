"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { demoCatalog } from "@/modules/catalog/demo";
import { validateCatalog } from "@/modules/catalog/model";
import {
  parseCart,
  quoteCart,
  changeCart,
  type CartQuote,
  type CartItem,
} from "@/modules/commerce/cart";
import { refreshCart, updateCart } from "@/modules/commerce/actions";
import { CartContents } from "./cart-contents";
import {
  validatePromotions,
  type Promotion,
} from "@/modules/commerce/promotions";

const previewKey = "stylo.cart-preview.v1";
export function previewPromotions(): Promotion[] {
  const source = localStorage.getItem("stylo.promotions-preview.v1");
  if (!source) return [];
  const promotions = JSON.parse(source).promotions;
  if (validatePromotions(promotions).length)
    throw new Error("Promociones de prueba inválidas.");
  return promotions;
}
export function previewCatalog() {
  const source = localStorage.getItem("stylo.catalog-preview.v1");
  if (!source) return demoCatalog();
  const data = JSON.parse(source).catalog;
  if (validateCatalog(data).length)
    throw new Error("No pudimos leer el catálogo de prueba.");
  return data;
}
const CartContext = createContext<{
  quote: CartQuote;
  preview: boolean;
  busy: boolean;
  error: string;
  change: (
    variantId: string,
    operation: string,
    quantity?: number,
  ) => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  updateQuote: (quote: CartQuote) => void;
} | null>(null);
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("Falta el contexto de carrito.");
  return value;
}
export function CartProvider({
  initialQuote,
  children,
}: {
  initialQuote: CartQuote;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const preview = pathname.startsWith("/vista-previa");
  const [realQuote, setRealQuote] = useState(initialQuote);
  const [localQuote, setLocalQuote] = useState(quoteCart(demoCatalog(), []));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [opened, setOpened] = useState(false);
  const quote = preview ? localQuote : realQuote;
  useEffect(() => setRealQuote(initialQuote), [initialQuote]);
  useEffect(() => {
    setError("");
    if (!preview) return;
    const sync = () => {
      try {
        const items = parseCart(
          JSON.parse(localStorage.getItem(previewKey) ?? "[]"),
        );
        setLocalQuote(quoteCart(previewCatalog(), items, previewPromotions()));
      } catch {
        setError("No pudimos recuperar el carrito de prueba.");
      }
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("stylo-preview-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("stylo-preview-change", sync);
    };
  }, [preview, pathname]);
  useEffect(() => {
    if (!opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [opened]);
  function closeCart() {
    dialog.current?.close();
    setOpened(false);
    opener.current?.focus({ preventScroll: true });
  }
  function openCart() {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.current?.showModal();
    setOpened(true);
    if (!preview)
      void refreshCart()
        .then(setRealQuote)
        .catch(() => setError("No pudimos actualizar el carrito."));
  }
  async function change(variantId: string, operation: string, quantity = 1) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (preview) {
        const catalog = previewCatalog();
        const items: CartItem[] = parseCart(
          JSON.parse(localStorage.getItem(previewKey) ?? "[]"),
        );
        const result = changeCart(
          catalog,
          items,
          variantId,
          operation,
          quantity,
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        localStorage.setItem(previewKey, JSON.stringify(result.items));
        setLocalQuote(quoteCart(catalog, result.items, previewPromotions()));
      } else {
        const form = new FormData();
        form.set("variantId", variantId);
        form.set("operation", operation);
        form.set("quantity", String(quantity));
        const result = await updateCart(form);
        setRealQuote(result.quote);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      if (operation === "add") openCart();
    } catch {
      setError("No pudimos guardar el carrito. Intentá otra vez.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <CartContext.Provider
      value={{
        quote,
        preview,
        busy,
        error,
        change,
        openCart,
        closeCart,
        updateQuote: preview ? setLocalQuote : setRealQuote,
      }}
    >
      {children}
      <dialog
        ref={dialog}
        className="cart-drawer"
        aria-labelledby="cart-title"
        onCancel={closeCart}
        onClose={() => setOpened(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeCart();
        }}
      >
        <div className="cart-drawer-inner">
          <div className="cart-heading">
            <div>
              <p className="eyebrow">TU SELECCIÓN</p>
              <h2 id="cart-title">Tu carrito</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Cerrar carrito"
              onClick={closeCart}
            >
              <Icon name="close" />
            </button>
          </div>
          <CartContents />
        </div>
      </dialog>
    </CartContext.Provider>
  );
}

export function CartLink() {
  const { quote, preview, openCart } = useCart();
  return (
    <Link
      href={preview ? "/vista-previa/carrito" : "/carrito"}
      className="icon-button cart-trigger"
      aria-label={`Abrir carrito, ${quote.quantity} unidades`}
      onClick={(event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        openCart();
      }}
    >
      <Icon name="bag" />
      <span className="cart-count" aria-hidden="true">
        {quote.quantity}
      </span>
    </Link>
  );
}
