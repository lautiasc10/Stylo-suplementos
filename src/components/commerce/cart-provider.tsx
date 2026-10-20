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
import { validateCatalog, type Catalog } from "@/modules/catalog/model";
import {
  parseCart,
  quoteCart,
  changeCart,
  cartSuggestions,
  type CartQuote,
  type CartItem,
  type CartSuggestion,
} from "@/modules/commerce/cart";
import { refreshCart, updateCart, addPromotion as addPromotionAction } from "@/modules/commerce/actions";
import { addPromotionToCart } from "@/modules/commerce/promotion-cart";
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
export function previewCatalog(): Catalog {
  const source = localStorage.getItem("stylo.catalog-preview.v1");
  if (!source) return demoCatalog();
  const data = JSON.parse(source).catalog;
  if (validateCatalog(data).length)
    throw new Error("No pudimos leer el catálogo de prueba.");
  return data;
}
const CartContext = createContext<{
  quote: CartQuote;
  catalog: Catalog;
  promotions: Promotion[];
  preview: boolean;
  busy: boolean;
  error: string;
  imageBase: string;
  imageUrls: Record<string, string>;
  suggestions: CartSuggestion[];
  paymentMethod: "mercado-pago" | "transferencia";
  setPaymentMethod: (value: "mercado-pago" | "transferencia") => void;
  change: (
    variantId: string,
    operation: string,
    quantity?: number,
  ) => Promise<boolean>;
  addPromotion: (promotionId: string) => Promise<boolean>;
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
  initialCatalog,
  initialPromotions = [],
  initialSuggestions = [],
  imageBase = "",
  children,
}: {
  initialQuote: CartQuote;
  initialCatalog: Catalog;
  initialPromotions?: Promotion[];
  initialSuggestions?: CartSuggestion[];
  imageBase?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const preview = pathname.startsWith("/vista-previa");
  const [realQuote, setRealQuote] = useState(initialQuote);
  const [localQuote, setLocalQuote] = useState(quoteCart(demoCatalog(), []));
  const [localCatalog, setLocalCatalog] = useState(demoCatalog);
  const [localPromotions, setLocalPromotions] = useState<Promotion[]>([]);
  const [localImages, setLocalImages] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"mercado-pago" | "transferencia">("transferencia");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [opened, setOpened] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshSequence = useRef(0);
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
        const catalog = previewCatalog(),
          promotions = previewPromotions();
        setLocalCatalog(catalog);
        const saved = JSON.parse(
          localStorage.getItem("stylo.catalog-preview.v1") ?? "{}",
        );
        setLocalImages(
          Object.fromEntries(
            Object.entries(saved.images ?? {}).filter(
              ([, value]) =>
                typeof value === "string" &&
                /^data:image\/(jpeg|png|webp);base64,/.test(value),
            ),
          ) as Record<string, string>,
        );
        setLocalPromotions(promotions);
        setLocalQuote(quoteCart(catalog, items, promotions));
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
    ++refreshSequence.current;
    setRefreshing(false);
    dialog.current?.close();
    setOpened(false);
    opener.current?.focus({ preventScroll: true });
  }
  function openCart() {
    if (dialog.current?.open) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.current?.showModal();
    setOpened(true);
    if (!preview) {
      const sequence = ++refreshSequence.current;
      setRefreshing(true);
      void refreshCart()
        .then((next) => {
          if (sequence === refreshSequence.current) setRealQuote(next);
        })
        .catch(() => {
          if (sequence === refreshSequence.current)
            setError("No pudimos actualizar el carrito.");
        })
        .finally(() => {
          if (sequence === refreshSequence.current) setRefreshing(false);
        });
    }
  }
  async function change(variantId: string, operation: string, quantity = 1) {
    if (lock.current) return false;
    lock.current = true;
    ++refreshSequence.current;
    setRefreshing(false);
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
          return false;
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
          return false;
        }
      }
      if (operation === "add") openCart();
      return true;
    } catch {
      setError("No pudimos guardar el carrito. Intentá otra vez.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function addPromotion(promotionId: string) {
    if (lock.current) return false;
    lock.current = true;
    ++refreshSequence.current;
    setRefreshing(false);
    setBusy(true);
    setError("");
    try {
      if (preview) {
        const catalog = previewCatalog();
        const promotions = previewPromotions();
        const items = parseCart(JSON.parse(localStorage.getItem(previewKey) ?? "[]"));
        const result = addPromotionToCart(catalog, items, promotions, promotionId);
        if (result.error) {
          setError(result.error);
          return false;
        }
        localStorage.setItem(previewKey, JSON.stringify(result.items));
        setLocalQuote(quoteCart(catalog, result.items, promotions));
      } else {
        const form = new FormData();
        form.set("promotionId", promotionId);
        const result = await addPromotionAction(form);
        setRealQuote(result.quote);
        if (result.error) {
          setError(result.error);
          return false;
        }
      }
      // Quick-add stays in the collection, with confirmation on its own button.
      return true;
    } catch {
      setError("No pudimos agregar la promoción. Intentá otra vez.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <CartContext.Provider
      value={{
        quote,
        catalog: preview ? localCatalog : initialCatalog,
        promotions: preview ? localPromotions : initialPromotions,
        preview,
        busy: busy || refreshing,
        error,
        imageBase: preview ? "" : imageBase,
        imageUrls: preview ? localImages : {},
        suggestions: preview ? cartSuggestions(localCatalog) : initialSuggestions,
        paymentMethod,
        setPaymentMethod,
        change,
        addPromotion,
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
              <h2 id="cart-title">
                Tu carrito <span aria-hidden="true">·</span> {quote.quantity}
              </h2>
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
          <CartContents compact />
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
      <Icon name="cart" />
      <span className="cart-count" aria-hidden="true">
        {quote.quantity}
      </span>
    </Link>
  );
}
