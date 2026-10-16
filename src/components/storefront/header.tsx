"use client";

import Link from "next/link";
import Form from "next/form";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "./brand-mark";
import { HomeLink } from "./home-link";
import { Icon } from "@/components/ui/icon";
import { categories } from "@/modules/catalog/categories";
import { CartLink, useCart } from "@/components/commerce/cart-provider";
import { AddToCart } from "@/components/commerce/add-to-cart";
import { ProductPricing } from "@/components/commerce/product-pricing";
import { HeroDust } from "./hero-dust";
import { useHomeIntro } from "./home-intro";
import { navigationCategories, type MenuCategory } from "./navigation-model";

const links = [
  { href: "/catalogo", label: "Tienda" },
  { href: "/nosotros", label: "Sobre STYLO" },
  { href: "/contacto", label: "Contacto" },
];
const HOVER_DELAY = 180;

export function Header({
  catalogCategories = categories,
}: {
  catalogCategories?: readonly MenuCategory[];
}) {
  const pathname = usePathname();
  const { preview, catalog: localCatalog, imageUrls } = useCart();
  // Preview purchases must use only the explicitly labelled local catalog.
  const menuCategories = useMemo(
    () =>
      preview
        ? navigationCategories(localCatalog, "", imageUrls)
        : catalogCategories,
    [preview, localCatalog, imageUrls, catalogCategories],
  );
  const productPrefix = preview ? "/vista-previa/producto" : "/producto";
  const { waiting } = useHomeIntro();
  const introWaiting = pathname === "/" && waiting;
  const [flavorPage, setFlavorPage] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lastCategory, setLastCategory] = useState(
    catalogCategories[0]?.slug ?? "",
  );
  const search = useRef<HTMLDetailsElement>(null);
  const mobile = useRef<HTMLDetailsElement>(null);
  const categoryTrigger = useRef<HTMLAnchorElement>(null);
  const categoryPanel = useRef<HTMLElement>(null);
  const suppressFocusOpen = useRef(false);
  const focusPanelOnOpen = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featuredCategory =
    menuCategories.find((item) => item.slug === lastCategory) ??
    menuCategories[0];

  function clearTimers() {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
  }
  function closeMenus() {
    clearTimers();
    setActiveCategory(null);
    if (search.current) search.current.open = false;
    if (mobile.current) mobile.current.open = false;
  }
  function showCategory(slug: string, trigger: HTMLAnchorElement) {
    clearTimers();
    setFlavorPage(!!document.querySelector(".flavor-product-detail"));
    categoryTrigger.current = trigger;
    setLastCategory(slug);
    setActiveCategory(slug);
  }
  function desktopMenu() {
    return window.matchMedia("(min-width: 801px) and (hover: hover)").matches;
  }

  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    clearTimers();
    setActiveCategory(null);
    if (search.current) search.current.open = false;
    if (mobile.current) mobile.current.open = false;
  }, [pathname]);
  useEffect(() => {
    if (!activeCategory || !focusPanelOnOpen.current) return;
    const frame = requestAnimationFrame(() => {
      focusPanelOnOpen.current = false;
      categoryPanel.current
        ?.querySelector<HTMLAnchorElement>(".category-mega-feature a")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeCategory]);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // The cart owns Escape until its modal closes; keep its opener available.
      if (document.querySelector(".cart-drawer[open]")) return;
      const details = search.current?.open
        ? search.current
        : mobile.current?.open
          ? mobile.current
          : null;
      if (details) {
        event.preventDefault();
        details.open = false;
        details.querySelector("summary")?.focus();
      } else if (activeCategory) {
        event.preventDefault();
        clearTimers();
        focusPanelOnOpen.current = false;
        setActiveCategory(null);
        if (document.activeElement !== categoryTrigger.current) {
          suppressFocusOpen.current = true;
          categoryTrigger.current?.focus();
        }
      }
    }
    function outside(event: PointerEvent) {
      for (const details of [search.current, mobile.current]) {
        if (details?.open && !details.contains(event.target as Node))
          details.open = false;
      }
    }
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [activeCategory]);

  return (
    <>
      <header id="inicio" className="site-header" inert={introWaiting}>
        <div className="container header-inner">
          <HomeLink onClick={closeMenus}>
            <BrandMark priority />
          </HomeLink>
          <nav className="desktop-nav" aria-label="Navegación principal">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <details
              className="header-search"
              ref={search}
              onToggle={(event) => {
                if (!event.currentTarget.open) return;
                if (mobile.current) mobile.current.open = false;
                event.currentTarget.querySelector("input")?.focus();
              }}
            >
              <summary className="icon-button" aria-label="Buscar productos">
                <Icon name="search" />
              </summary>
              <Form
                action="/catalogo"
                className="header-search-form"
                onSubmit={closeMenus}
              >
                <label htmlFor="header-search-input">
                  Buscá tu próximo producto
                </label>
                <div>
                  <input
                    id="header-search-input"
                    name="q"
                    type="search"
                    placeholder="Producto o marca"
                    maxLength={100}
                  />
                  <button type="submit" className="button button-gold">
                    Buscar <Icon name="arrow" />
                  </button>
                </div>
              </Form>
            </details>
            <CartLink />
            <details
              className="mobile-menu"
              ref={mobile}
              onToggle={(event) => {
                if (event.currentTarget.open && search.current)
                  search.current.open = false;
              }}
            >
              <summary
                className="icon-button menu-toggle"
                aria-label="Menú de navegación"
              >
                <span className="menu-glyph" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </summary>
              <nav className="mobile-nav" aria-label="Navegación móvil">
                <div className="mobile-primary-links">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={pathname === link.href ? "page" : undefined}
                      onClick={closeMenus}
                    >
                      {link.label}
                      <Icon name="arrow" />
                    </Link>
                  ))}
                </div>
                <p className="eyebrow">Categorías</p>
                <div className="mobile-category-links">
                  {menuCategories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/catalogo?categoria=${category.slug}`}
                      onClick={closeMenus}
                    >
                      {category.name}
                      <Icon name="arrow" />
                    </Link>
                  ))}
                </div>
              </nav>
            </details>
          </div>
        </div>
      </header>
      <div
        className="category-navigation-shell"
        inert={introWaiting}
        onMouseEnter={() => {
          if (closeTimer.current !== null) clearTimeout(closeTimer.current);
        }}
        onMouseLeave={(event) => {
          clearTimers();
          if (event.currentTarget.querySelector(":focus-visible")) return;
          closeTimer.current = setTimeout(() => {
            if (!document.querySelector(".cart-drawer[open]"))
              setActiveCategory(null);
          }, HOVER_DELAY);
        }}
        onBlur={(event) => {
          if (document.querySelector(".cart-drawer[open]")) {
            clearTimers();
            return;
          }
          if (!event.currentTarget.contains(event.relatedTarget)) {
            clearTimers();
            setActiveCategory(null);
          }
        }}
      >
        <nav
          className="category-navigation"
          aria-label="Explorar por categoría"
        >
          <div className="container">
            {menuCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/catalogo?categoria=${category.slug}`}
                data-active={
                  activeCategory === category.slug ? "true" : undefined
                }
                onMouseEnter={(event) => {
                  if (!desktopMenu()) return;
                  clearTimers();
                  const trigger = event.currentTarget;
                  openTimer.current = setTimeout(
                    () => showCategory(category.slug, trigger),
                    HOVER_DELAY,
                  );
                }}
                onMouseLeave={() => {
                  if (openTimer.current !== null)
                    clearTimeout(openTimer.current);
                }}
                onFocus={(event) => {
                  if (!desktopMenu()) return;
                  if (suppressFocusOpen.current) {
                    suppressFocusOpen.current = false;
                    return;
                  }
                  showCategory(category.slug, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" || !desktopMenu()) return;
                  event.preventDefault();
                  if (activeCategory === category.slug)
                    categoryPanel.current
                      ?.querySelector<HTMLAnchorElement>(
                        ".category-mega-feature a",
                      )
                      ?.focus();
                  else {
                    focusPanelOnOpen.current = true;
                    showCategory(category.slug, event.currentTarget);
                  }
                }}
                onClick={closeMenus}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </nav>
        {featuredCategory && (
          <section
            ref={categoryPanel}
            className="category-mega-menu"
            data-open={activeCategory ? "true" : "false"}
            aria-label={`Explorar ${featuredCategory.name}`}
            aria-hidden={!activeCategory}
            inert={!activeCategory}
          >
            {activeCategory && !flavorPage && (
              <HeroDust containerRef={categoryPanel} enabled variant="menu" />
            )}
            <div className="container category-mega-inner">
              <div className="category-mega-feature">
                <span className="eyebrow">ENCONTRÁ TU STYLO</span>
                <h2>{featuredCategory.name}</h2>
                <Link
                  href={`/catalogo?categoria=${featuredCategory.slug}`}
                  onClick={closeMenus}
                >
                  Ver categoría <Icon name="arrow" />
                </Link>
              </div>
              <div className="category-mega-products">
                {featuredCategory.products?.length ? (
                  <>
                    <p className="mega-products-label">De esta categoría</p>
                    <div className="mega-product-grid">
                      {featuredCategory.products.map((product) => (
                        <article className="mega-product" key={product.id}>
                          <Link
                            className="mega-product-link"
                            href={`${productPrefix}/${product.slug}?variante=${product.variant.id}`}
                            onClick={closeMenus}
                          >
                            <div className="mega-product-image">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt=""
                                  width={112}
                                  height={112}
                                  loading="lazy"
                                />
                              ) : (
                                <Icon name="bag" />
                              )}
                            </div>
                            <h3>{product.name}</h3>
                            <p>{product.variantLabel}</p>
                          </Link>
                          <ProductPricing variant={product.variant} compact />
                          <AddToCart
                            variantId={product.variant.id}
                            stock={product.variant.stock}
                            slug={product.slug}
                            compact
                            accessibleLabel={`Agregar ${product.name}, ${product.variantLabel}`}
                          />
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mega-empty">
                    <p>
                      Encontrá tu próxima elección en{" "}
                      {featuredCategory.name.toLocaleLowerCase("es-AR")}.
                    </p>
                    <Link
                      className="text-link"
                      href={`/catalogo?categoria=${featuredCategory.slug}`}
                      onClick={closeMenus}
                    >
                      Explorar productos <Icon name="arrow" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
