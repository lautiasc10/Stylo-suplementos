"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/commerce/cart-provider";
import { Icon } from "@/components/ui/icon";
import { formatPrice } from "@/modules/catalog/model";
import { priceLines } from "@/modules/commerce/promotions";
import {
  createSearchIndex,
  EMPTY_SEARCH_INDEX,
  highlightSearch,
  normalizeSearch,
  POPULAR_SEARCHES,
  prepareSearch,
  type SearchIndex,
} from "@/modules/catalog/search";

const RECENTS_KEY = "stylo.search-recents.v1";
const DEBOUNCE_MS = 175;
type Option = {
  kind: "product" | "category" | "brand";
  name: string;
  href: string;
  brand?: string;
  image?: string;
  price?: number;
  stock?: number;
  label?: string;
};

export function SearchPanel({ onOpen }: { onOpen: () => void }) {
  const router = useRouter(),
    pathname = usePathname(),
    id = useId();
  const { preview, catalog, imageUrls, promotions } = useCart();
  const trigger = useRef<HTMLAnchorElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<{ index: SearchIndex; at: number } | null>(null);
  const [open, setOpen] = useState(false),
    [closing, setClosing] = useState(false);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState(""),
    [settled, setSettled] = useState("");
  const [active, setActive] = useState(-1),
    [recents, setRecents] = useState<string[]>([]);
  const [remote, setRemote] = useState<SearchIndex | null>(null),
    [fetching, setFetching] = useState(false),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
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
  const options: Option[] =
    loading || error || !settled.trim()
      ? []
      : [
          ...results.products.slice(0, 5).map(({ product, variant }) => ({
            kind: "product" as const,
            name: product.name,
            href: `${preview ? "/vista-previa" : ""}/producto/${product.slug}?variante=${variant.id}`,
            brand: product.brand.name,
            image: variant.image,
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
              promotions.filter((p) => p.kind === "sale"),
              "mercado-pago",
            ).total,
            stock: variant.stock,
            label: variant.label,
          })),
          ...results.categories.map((c) => ({
            kind: "category" as const,
            name: c.name,
            href: `${target}?categoria=${encodeURIComponent(c.slug)}`,
          })),
          ...results.brands.map((b) => ({
            kind: "brand" as const,
            name: b.name,
            href: `${target}?marca=${encodeURIComponent(b.slug)}`,
          })),
        ];
  function remember(text: string) {
    const value = text.trim().slice(0, 100);
    if (!value) return;
    const next = [
      value,
      ...recents.filter((r) => normalizeSearch(r) !== normalizeSearch(value)),
    ].slice(0, 5);
    saveRecents(next);
  }
  function saveRecents(next: string[]) {
    setRecents(next);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* Search works when storage is unavailable. */
    }
  }
  function finishClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    dialog.current?.close();
    setOpen(false);
    setClosing(false);
    trigger.current?.focus({ preventScroll: true });
  }
  function close() {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishClose();
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(finishClose, 180);
  }
  function show() {
    if (document.querySelector(".cart-drawer[open]")) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onOpen();
    setClosing(false);
    setOpen(true);
    setActive(-1);
    dialog.current?.showModal();
    input.current?.focus();
    try {
      const saved = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
      setRecents(
        Array.isArray(saved)
          ? saved
              .filter(
                (s): s is string =>
                  typeof s === "string" && !!s.trim() && s.length <= 100,
              )
              .slice(0, 5)
          : [],
      );
    } catch {
      setRecents([]);
    }
  }
  function choose(href: string) {
    remember(query);
    finishClose();
    router.push(href);
  }
  function searchAll() {
    choose(
      `${target}${query.trim() ? `?q=${encodeURIComponent(query.trim().slice(0, 100))}` : ""}`,
    );
  }
  const latestShow = useRef(show);
  latestShow.current = show;
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) input.current?.focus();
        else latestShow.current();
      }
    }
    window.addEventListener("keydown", shortcut);
    setReady(true);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (dialog.current?.open) finishClose();
  }, [pathname]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0)
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gap}px`;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      document.body.style.paddingRight = padding;
    };
  }, [open]);
  useEffect(() => {
    setActive(-1);
    if (!open || closing) return;
    const timer = setTimeout(() => setSettled(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
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
          throw new Error("Invalid search index");
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

  return (
    <>
      <a
        ref={trigger}
        href="/buscar"
        className="icon-button search-trigger"
        aria-label="Buscar productos"
        aria-haspopup={ready ? "dialog" : undefined}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.preventDefault();
          show();
        }}
      >
        <Icon name="search" />
      </a>
      <dialog
        ref={dialog}
        className="search-dialog"
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
          className="search-panel"
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
                  'a[href]:not([tabindex="-1"]),button:not(:disabled),input:not([type="hidden"]):not(:disabled),select:not(:disabled),[tabindex="0"]',
                ) ?? [],
              ).filter(
                (element) =>
                  element.getClientRects().length > 0 &&
                  !element.closest("[hidden]"),
              );
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
              if (options.length)
                setActive((value) =>
                  event.key === "ArrowDown"
                    ? (value + 1) % options.length
                    : (value <= 0 ? options.length : value) - 1,
                );
            }
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (active >= 0 && options[active]) choose(options[active].href);
              else searchAll();
            }
          }}
        >
          <div className="search-panel-heading">
            <h2 id={`${id}-title`}>Encontrá tu próximo STYLO</h2>
            <button
              type="button"
              className="search-close icon-button"
              aria-label="Cerrar búsqueda"
              onClick={close}
            >
              <Icon name="close" />
            </button>
          </div>
          <form
            action={target}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              searchAll();
            }}
          >
            <label className="sr-only" htmlFor={`${id}-input`}>
              Buscar productos
            </label>
            <div className="search-input-wrap">
              <Icon name="search" />
              <input
                ref={input}
                id={`${id}-input`}
                name="q"
                type="search"
                role="combobox"
                autoComplete="off"
                autoFocus
                maxLength={100}
                placeholder="Producto, marca o sabor"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(-1);
                }}
                aria-expanded={!!query.trim() && !loading && options.length > 0}
                aria-controls={`${id}-listbox`}
                aria-autocomplete="list"
                aria-activedescendant={
                  active >= 0 && options[active]
                    ? `${id}-option-${active}`
                    : undefined
                }
                aria-describedby={`${id}-status`}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  className="search-clear"
                  onClick={() => {
                    setQuery("");
                    input.current?.focus();
                  }}
                >
                  <Icon name="close" />
                </button>
              )}
              <kbd className="search-shortcut">Ctrl K</kbd>
            </div>
          </form>
          <p
            id={`${id}-status`}
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {!query.trim()
              ? "Buscá por producto, marca, categoría o sabor."
              : loading
                ? "Buscando…"
                : error
                  ? "La búsqueda no está disponible. Podés reintentar."
                  : `${options.length} resultados sugeridos. ${results.products.length} productos encontrados.`}
          </p>
          <div className="search-panel-body" aria-busy={loading}>
            {error ? (
              <div className="search-error" role="alert">
                <h3>No pudimos cargar la búsqueda</h3>
                <p>Reintentá o seguí explorando la tienda.</p>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => {
                    cache.current = null;
                    setRetry((v) => v + 1);
                  }}
                >
                  Reintentar
                </button>
                <Link href={shop} onClick={finishClose}>
                  Ir a la tienda
                </Link>
              </div>
            ) : null}
            {!query.trim() ? (
              <div className="search-initial">
                <div>
                  <div className="search-group-heading">
                    <h3>Búsquedas recientes</h3>
                    {recents.length > 0 && (
                      <button type="button" onClick={() => saveRecents([])}>
                        Borrar todo
                      </button>
                    )}
                  </div>
                  {recents.length ? (
                    <ul className="search-recents">
                      {recents.map((text) => (
                        <li key={text}>
                          <button
                            type="button"
                            onClick={() => {
                              setQuery(text);
                              input.current?.focus();
                            }}
                          >
                            {text}
                          </button>
                          <button
                            type="button"
                            aria-label={`Borrar búsqueda ${text}`}
                            onClick={() =>
                              saveRecents(recents.filter((r) => r !== text))
                            }
                          >
                            <Icon name="close" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="search-muted">
                      Tus búsquedas van a aparecer acá.
                    </p>
                  )}
                  <h3>Búsquedas populares</h3>
                  <div className="search-chips">
                    {POPULAR_SEARCHES.map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => {
                          setQuery(text);
                          input.current?.focus();
                        }}
                      >
                        {text}
                        <Icon name="arrow" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Categorías</h3>
                  <div className="search-quick-links">
                    {index.categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`${target}?categoria=${encodeURIComponent(category.slug)}`}
                        onClick={finishClose}
                      >
                        {category.name}
                        <Icon name="arrow" />
                      </Link>
                    ))}
                  </div>
                  <h3>Marcas</h3>
                  <div className="search-quick-brands">
                    {index.brands.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`${target}?marca=${encodeURIComponent(brand.slug)}`}
                        onClick={finishClose}
                      >
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                  {fetching && (
                    <p className="search-muted">
                      Cargando categorías y marcas…
                    </p>
                  )}
                </div>
              </div>
            ) : loading ? (
              <div className="search-skeleton" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : !options.length && !error ? (
              <div className="search-no-results">
                <h3>No encontramos «{query.trim()}»</h3>
                <p>Probá con otro nombre, marca o sabor.</p>
                <div className="search-chips">
                  {POPULAR_SEARCHES.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => {
                        setQuery(text);
                        input.current?.focus();
                      }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <Link href={shop} className="text-link" onClick={finishClose}>
                  Explorar la tienda completa <Icon name="arrow" />
                </Link>
              </div>
            ) : null}
            <div
              id={`${id}-listbox`}
              role="listbox"
              aria-label="Resultados de búsqueda"
              hidden={!query.trim() || loading || !options.length}
            >
              {(
                [
                  ["product", "Productos"],
                  ["category", "Categorías"],
                  ["brand", "Marcas"],
                ] as const
              ).map(([kind, title]) =>
                options.some((o) => o.kind === kind) ? (
                  <div role="group" aria-label={title} key={kind}>
                    <h3 aria-hidden="true">{title}</h3>
                    {options.map((option, i) =>
                      option.kind === kind ? (
                        <a
                          role="option"
                          id={`${id}-option-${i}`}
                          aria-selected={active === i}
                          key={option.href}
                          href={option.href}
                          tabIndex={-1}
                          className={`search-option search-option-${kind}`}
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
                            choose(option.href);
                          }}
                        >
                          {kind === "product" && (
                            <span className="search-product-image">
                              {option.image ? (
                                <img
                                  src={option.image}
                                  width={68}
                                  height={76}
                                  alt=""
                                  loading="lazy"
                                />
                              ) : (
                                <Icon name="bag" />
                              )}
                            </span>
                          )}
                          <span className="search-option-copy">
                            <strong>
                              {highlightSearch(option.name, settled).map(
                                (part, j) =>
                                  part.match ? (
                                    <mark key={j}>{part.text}</mark>
                                  ) : (
                                    part.text
                                  ),
                              )}
                            </strong>
                            {option.brand && (
                              <span>
                                {option.brand} · {option.label}
                              </span>
                            )}
                          </span>
                          {option.price !== undefined && (
                            <span className="search-option-price">
                              {formatPrice(option.price, 0)}
                              {option.stock === 0 && <small>Sin stock</small>}
                            </span>
                          )}
                          <Icon name="arrow" />
                        </a>
                      ) : null,
                    )}
                  </div>
                ) : null,
              )}
            </div>
          </div>
          <div className="search-panel-footer">
            {query.trim() ? (
              <Link
                href={`${target}?q=${encodeURIComponent(query.trim())}`}
                onClick={() => {
                  remember(query);
                  finishClose();
                }}
              >
                Ver todos los resultados para «{query.trim()}»{" "}
                <Icon name="arrow" />
              </Link>
            ) : (
              <Link href={shop} onClick={finishClose}>
                Explorar toda la tienda <Icon name="arrow" />
              </Link>
            )}
            <p>
              <span>↑↓ navegar</span>
              <span>Enter abrir</span>
              <span>Esc cerrar</span>
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
