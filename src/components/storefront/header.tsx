"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { categories } from "@/modules/catalog/categories";
import { CartLink } from "@/components/commerce/cart-provider";

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
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
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
      <div className="announcement">
        <span>STYLO SUPLEMENTOS · ROSARIO</span>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link
            href="/"
            aria-label="STYLO Suplementos, inicio"
            className="brand-link"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/branding/logo-principal.webp"
              width={80}
              height={80}
              alt=""
              priority
            />
            <span className="brand-name brand-caption">
              Suplementos<span>TU RUTINA. TU STYLO.</span>
            </span>
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
        <nav
          className="category-navigation"
          aria-label="Explorar por categoría"
        >
          <div className="container">
            {catalogCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/catalogo?categoria=${category.slug}`}
                onClick={() => setOpen(false)}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}
