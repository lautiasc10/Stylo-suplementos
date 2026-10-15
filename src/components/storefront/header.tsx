"use client";

import { BrandMark } from "./brand-mark";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { categories } from "@/modules/catalog/categories";
import { CartLink } from "@/components/commerce/cart-provider";
import { HeroDust } from "./hero-dust";
import { useHomeIntro } from "./home-intro";

const links = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/nosotros", label: "Sobre STYLO" },
  { href: "/contacto", label: "Contacto" },
];

export function Header({
  catalogCategories = categories,
}: {
  catalogCategories?: readonly { name: string; slug: string }[];
}) {
  const pathname = usePathname();
  const { waiting } = useHomeIntro();
  const introWaiting = pathname === "/" && waiting;
  const [flavorPage, setFlavorPage] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lastCategory, setLastCategory] = useState(
    catalogCategories[0]?.slug ?? "",
  );
  const toggle = useRef<HTMLButtonElement>(null);
  const categoryTrigger = useRef<HTMLAnchorElement>(null);
  const categoryPanel = useRef<HTMLElement>(null);
  const suppressFocusOpen = useRef(false);
  const focusPanelOnOpen = useRef(false);
  const categoryCloseTimer = useRef<number | null>(null);
  const featuredCategory =
    catalogCategories.find((item) => item.slug === lastCategory) ??
    catalogCategories[0];
  const otherCategories = catalogCategories.filter(
    (item) => item.slug !== featuredCategory?.slug,
  );

  function showCategory(slug: string, trigger: HTMLAnchorElement) {
    setFlavorPage(!!document.querySelector(".flavor-product-detail"));
    if (categoryCloseTimer.current !== null) {
      window.clearTimeout(categoryCloseTimer.current);
      categoryCloseTimer.current = null;
    }
    categoryTrigger.current = trigger;
    setLastCategory(slug);
    setActiveCategory(slug);
  }

  useEffect(
    () => () => {
      if (categoryCloseTimer.current !== null)
        window.clearTimeout(categoryCloseTimer.current);
    },
    [],
  );
  useEffect(() => setActiveCategory(null), [pathname]);
  useEffect(() => {
    if (!activeCategory || !focusPanelOnOpen.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (categoryPanel.current?.dataset.open !== "true") return;
      focusPanelOnOpen.current = false;
      categoryPanel.current
        .querySelector<HTMLAnchorElement>(".category-mega-feature a")
        ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeCategory]);
  useEffect(() => {
    if (!activeCategory) return;
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      focusPanelOnOpen.current = false;
      setActiveCategory(null);
      if (document.activeElement !== categoryTrigger.current) {
        suppressFocusOpen.current = true;
        categoryTrigger.current?.focus();
      }
    }
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [activeCategory]);
  useEffect(() => {
    if (!open) return;
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [open]);
  return (
    <>
      <header className="site-header" inert={introWaiting}>
        <div className="container header-inner">
          <Link
            href="/"
            aria-label="STYLO Suplementos, inicio"
            className="brand-link"
            onClick={() => setOpen(false)}
          >
            <BrandMark priority />
          </Link>
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
            <CartLink />
            <button
              className="icon-button menu-toggle"
              ref={toggle}
              type="button"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="menu-glyph" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Navegación móvil"
          hidden={!open}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
              <Icon name="arrow" />
            </Link>
          ))}
        </nav>
      </header>
      <div
        className="category-navigation-shell"
        inert={introWaiting}
        onMouseEnter={() => {
          if (categoryCloseTimer.current !== null) {
            window.clearTimeout(categoryCloseTimer.current);
            categoryCloseTimer.current = null;
          }
        }}
        onMouseLeave={() => {
          categoryCloseTimer.current = window.setTimeout(() => {
            setActiveCategory(null);
            categoryCloseTimer.current = null;
          }, 150);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setActiveCategory(null);
        }}
      >
        <nav
          className="category-navigation"
          aria-label="Explorar por categoría"
        >
          <div className="container">
            {catalogCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/catalogo?categoria=${category.slug}`}
                data-active={
                  activeCategory === category.slug ? "true" : undefined
                }
                onMouseEnter={(event) => {
                  if (
                    window.matchMedia("(min-width: 801px) and (hover: hover)")
                      .matches
                  )
                    showCategory(category.slug, event.currentTarget);
                }}
                onFocus={(event) => {
                  if (
                    !window.matchMedia("(min-width: 801px) and (hover: hover)")
                      .matches
                  )
                    return;
                  if (suppressFocusOpen.current) {
                    suppressFocusOpen.current = false;
                    return;
                  }
                  showCategory(category.slug, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key !== "ArrowDown" ||
                    !window.matchMedia("(min-width: 801px) and (hover: hover)")
                      .matches
                  )
                    return;
                  event.preventDefault();
                  if (activeCategory === category.slug) {
                    categoryPanel.current
                      ?.querySelector<HTMLAnchorElement>(
                        ".category-mega-feature a",
                      )
                      ?.focus();
                    return;
                  }
                  focusPanelOnOpen.current = true;
                  showCategory(category.slug, event.currentTarget);
                }}
                onClick={() => {
                  setActiveCategory(null);
                  setOpen(false);
                }}
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
                <span className="eyebrow">EXPLORÁ STYLO</span>
                <h2>{featuredCategory.name}</h2>
                <Link
                  href={`/catalogo?categoria=${featuredCategory.slug}`}
                  onClick={() => setActiveCategory(null)}
                >
                  Ver categoría <Icon name="arrow" />
                </Link>
              </div>
              <div className="category-mega-other">
                <h3>Otras categorías</h3>
                <div>
                  {otherCategories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/catalogo?categoria=${category.slug}`}
                      onClick={() => setActiveCategory(null)}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
