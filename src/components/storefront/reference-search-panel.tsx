"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useCart } from "@/components/commerce/cart-provider";
import { Icon } from "@/components/ui/icon";
import { AddToCart } from "@/components/commerce/add-to-cart";
import { formatPrice } from "@/modules/catalog/model";
import { priceLines } from "@/modules/commerce/promotions";
import {
  createSearchIndex,
  EMPTY_SEARCH_INDEX,
  prepareSearch,
  type SearchIndex,
} from "@/modules/catalog/search";
import { heroDisplay, heroBody } from "./hero-fonts";

const DEBOUNCE_MS = 175;

function SearchPhoto({ src }: { src: string }) {
  const [loaded, setLoaded] = useState("");
  const [failed, setFailed] = useState("");
  return (
    <span
      className="reference-search-thumbnail"
      data-loaded={!!src && loaded === src && failed !== src}
    >
      <Icon name="bag" />
      {src && failed !== src && (
        <img
          src={src}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          onLoad={() => setLoaded(src)}
          onError={() => setFailed(src)}
        />
      )}
    </span>
  );
}

export function SearchPanel({ onOpen }: { onOpen: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const { preview, catalog, imageUrls, promotions } = useCart();
  const trigger = useRef<HTMLAnchorElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const cache = useRef<{ index: SearchIndex; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [settled, setSettled] = useState("");
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<SearchIndex | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const local = useMemo(
    () => (preview ? createSearchIndex(catalog, "", imageUrls) : null),
    [preview, catalog, imageUrls],
  );
  const index = local ?? remote ?? EMPTY_SEARCH_INDEX;
  const engine = useMemo(() => prepareSearch(index), [index]);
  const results = useMemo(() => engine(settled), [engine, settled]);
  const loading = fetching || query.trim() !== settled.trim();
  const target = preview ? "/vista-previa/buscar" : "/buscar";
  const shop = preview ? "/vista-previa" : "/catalogo";
  const sales = useMemo(
    () => promotions.filter((p) => p.kind === "sale"),
    [promotions],
  );
  const products = useMemo(
    () =>
      results.products.slice(0, 20).map(({ product, variant }) => ({
        product,
        variant,
        href: `${preview ? "/vista-previa" : ""}/producto/${product.slug}?variante=${variant.id}`,
        price: priceLines(
          [
            {
              variantId: variant.id,
              quantity: 1,
              listPrice: variant.listPrice,
              cashPrice: variant.listPrice,
              available: variant.stock > 0,
            },
          ],
          sales,
          "mercado-pago",
        ).total,
      })),
    [results.products, preview, sales],
  );

  function finishClose() {
    if (timer.current) clearTimeout(timer.current);
    dialog.current?.close();
    setOpen(false);
    setClosing(false);
    trigger.current?.focus({ preventScroll: true });
  }
  function close() {
    if (closing) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      return finishClose();
    setClosing(true);
    timer.current = setTimeout(finishClose, 160);
  }
  function show() {
    if (document.querySelector(".cart-drawer[open]")) return;
    if (timer.current) clearTimeout(timer.current);
    onOpen();
    setClosing(false);
    setOpen(true);
    setActive(-1);
    dialog.current?.showModal();
    input.current?.focus();
  }
  const latestShow = useRef(show);
  latestShow.current = show;
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) input.current?.focus();
        else latestShow.current();
      }
    }
    window.addEventListener("keydown", shortcut);
    setReady(true);
    return () => {
      window.removeEventListener("keydown", shortcut);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (dialog.current?.open) finishClose();
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const gap = innerWidth - document.documentElement.clientWidth;
    if (gap > 0)
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gap}px`;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
    };
  }, [open]);
  useEffect(() => {
    setActive(-1);
    if (!open || closing) return;
    const debounce = setTimeout(() => setSettled(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(debounce);
  }, [query, open, closing]);
  useEffect(() => {
    if (!open || closing) return;
    if (preview) {
      setFetching(false);
      setError(false);
      return;
    }
    if (cache.current && Date.now() - cache.current.at < 60000) {
      setRemote(cache.current.index);
      setFetching(false);
      setError(false);
      return;
    }
    const controller = new AbortController();
    setFetching(true);
    setError(false);
    fetch("/api/buscar", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Search unavailable");
        const data = (await response.json()) as SearchIndex;
        if (
          !Array.isArray(data.products) ||
          !Array.isArray(data.categories) ||
          !Array.isArray(data.brands)
        )
          throw new Error("Invalid index");
        if (controller.signal.aborted) return;
        cache.current = { index: data, at: Date.now() };
        setRemote(data);
        setFetching(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
          setFetching(false);
        }
      });
    return () => controller.abort();
  }, [open, closing, preview, retry]);
  useEffect(() => {
    if (open && active >= 0)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  function choose(href: string) {
    finishClose();
    router.push(href);
  }
  function searchAll() {
    choose(
      `${target}${query.trim() ? `?q=${encodeURIComponent(query.trim().slice(0, 100))}` : ""}`,
    );
  }

  return (
    <>
      <a
        ref={trigger}
        href="/buscar"
        className="search-trigger reference-search-trigger"
        aria-label="Buscar productos"
        aria-haspopup={ready ? "dialog" : undefined}
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
          show();
        }}
      >
        <Icon name="search" />
        <span>Buscar productos</span>
        <kbd>⌘K</kbd>
      </a>
      <dialog
        ref={dialog}
        className={`search-dialog reference-search-dialog ${heroDisplay.variable} ${heroBody.variable}`}
        aria-labelledby={`${id}-title`}
        aria-modal="true"
        data-closing={closing}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div
          className="reference-search-panel"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
              return;
            }
            if (event.key === "Tab") {
              const controls = Array.from(
                dialog.current?.querySelectorAll<HTMLElement>(
                  'a[href]:not([tabindex="-1"]),button:not(:disabled),input:not(:disabled)',
                ) ?? [],
              ).filter((el) => el.getClientRects().length > 0);
              const first = controls[0],
                last = controls.at(-1);
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }
            if (event.target !== input.current) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!loading && products.length)
                setActive((n) =>
                  event.key === "ArrowDown"
                    ? (n + 1) % products.length
                    : (n <= 0 ? products.length : n) - 1,
                );
            }
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (!loading && active >= 0 && products[active])
                choose(products[active].href);
              else searchAll();
            }
          }}
        >
          <h2 className="sr-only" id={`${id}-title`}>
            Buscar productos
          </h2>
          <form
            role="search"
            action={target}
            className="reference-search-input"
            onSubmit={(event) => {
              event.preventDefault();
              searchAll();
            }}
          >
            <Icon name="search" />
            <label className="sr-only" htmlFor={`${id}-input`}>
              Buscar productos
            </label>
            <input
              ref={input}
              id={`${id}-input`}
              name="q"
              type="search"
              role="combobox"
              autoFocus
              autoComplete="off"
              maxLength={100}
              placeholder="Buscá proteína, creatina, una marca…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(-1);
              }}
              aria-expanded={!loading && products.length > 0}
              aria-controls={`${id}-listbox`}
              aria-autocomplete="list"
              aria-activedescendant={
                !loading && active >= 0 && products[active]
                  ? `${id}-option-${active}`
                  : undefined
              }
              aria-describedby={`${id}-status`}
            />
            <button
              type="button"
              className="reference-search-close"
              onClick={close}
              aria-label="Cerrar búsqueda"
            >
              <span>Esc</span>
              <Icon name="close" />
            </button>
          </form>
          <p
            id={`${id}-status`}
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {loading
              ? "Buscando…"
              : error
                ? "La búsqueda no está disponible."
                : `${results.products.length} productos encontrados.`}
          </p>
          <div className="reference-search-body" aria-busy={loading}>
            {error ? (
              <div className="reference-search-empty" role="alert">
                <p>No pudimos cargar la búsqueda.</p>
                <button
                  type="button"
                  onClick={() => {
                    cache.current = null;
                    setRetry((n) => n + 1);
                  }}
                >
                  Reintentar
                </button>
                <Link href={shop} onClick={finishClose}>
                  Ir a la tienda →
                </Link>
              </div>
            ) : loading ? (
              <div className="reference-search-skeleton" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : (
              <ul
                role="listbox"
                id={`${id}-listbox`}
                aria-label="Resultados de búsqueda"
                className="reference-search-results"
              >
                {!products.length && (
                  <li role="presentation" className="reference-search-empty">
                    <h3>No encontramos «{query.trim()}».</h3>
                    <Link href={shop} onClick={finishClose}>
                      Explorar la tienda →
                    </Link>
                  </li>
                )}
                {products.map(({ product, variant, href, price }, i) => (
                  <li
                    key={`${product.id}:${variant.id}`}
                    role="presentation"
                    className="reference-search-row"
                    data-active={active === i}
                    style={
                      {
                        "--result-delay": `${Math.min(i, 8) * 40}ms`,
                      } as CSSProperties
                    }
                  >
                    <Link
                      href={href}
                      role="option"
                      id={`${id}-option-${i}`}
                      aria-selected={active === i}
                      tabIndex={-1}
                      className="reference-search-product"
                      onMouseEnter={() => setActive(i)}
                      onClick={(event) => {
                        if (
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey
                        )
                          return;
                        event.preventDefault();
                        choose(href);
                      }}
                    >
                      <SearchPhoto src={variant.image} />
                      <span>
                        <strong>{product.name}</strong>
                        <small>
                          {product.brand.name} · {formatPrice(price, 0)}
                        </small>
                        {variant.stock === 0 && <small>Sin stock</small>}
                      </span>
                    </Link>
                    <AddToCart
                      variantId={variant.id}
                      stock={variant.stock}
                      slug={product.slug}
                      compact
                      accessibleLabel={`Agregar ${product.name}, ${variant.label} al carrito`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!loading && !error && results.products.length > 20 && (
            <Link
              className="reference-search-all"
              href={
                query.trim()
                  ? `${target}?q=${encodeURIComponent(query.trim())}`
                  : shop
              }
              onClick={finishClose}
            >
              {query.trim()
                ? "Ver todos los resultados →"
                : "Ver todos los productos →"}
            </Link>
          )}
        </div>
      </dialog>
    </>
  );
}
