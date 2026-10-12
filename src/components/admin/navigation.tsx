"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  catalogSection,
  navigateCatalogSection,
} from "@/components/catalog/section-navigation";

export function AdminNavigation({ preview = false }: { preview?: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 960px)");
    const update = () => {
      if (menu.current) menu.current.open = desktop.matches;
    };
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);
  const pathname = usePathname(),
    params = useSearchParams();
  if (
    !preview &&
    (pathname === "/admin/login" || pathname.startsWith("/admin/mfa"))
  )
    return null;
  const catalog = preview ? "/vista-previa/gestion" : "/admin/catalogo";
  const currentSection = catalogSection(params.get("seccion"));
  const groups = [
    {
      label: "Operación",
      links: [
        {
          href: preview ? "/vista-previa/pedidos" : "/admin/pedidos",
          label: "Ventas y retiros",
          icon: "cart" as const,
        },
        {
          href: catalog,
          label: "Productos",
          icon: "bag" as const,
          section: "products",
        },
        {
          href: preview ? "/vista-previa/promociones" : "/admin/promociones",
          label: "Promociones",
          icon: "bolt" as const,
        },
      ],
    },
    {
      label: "Catálogo",
      links: [
        {
          href: catalog,
          label: "Marcas",
          icon: "bag" as const,
          section: "brands",
        },
        {
          href: catalog,
          label: "Categorías",
          icon: "menu" as const,
          section: "categories",
        },
        {
          href: catalog,
          label: "Carga masiva",
          icon: "arrow" as const,
          section: "import",
        },
      ],
    },
  ];
  return (
    <nav className="admin-navigation" aria-label="Administración">
      <details ref={menu} open>
        <summary>
          Menú de administración <Icon name="menu" />
        </summary>
        {!preview && (
          <Link
            href="/admin"
            aria-current={pathname === "/admin" ? "page" : undefined}
          >
            <Icon name="shield" />
            Resumen
          </Link>
        )}
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <p className="admin-nav-label">{group.label}</p>
            {group.links.map((link) => (
              <Link
                key={link.label}
                href={
                  link.section
                    ? `${link.href}?seccion=${link.section}`
                    : link.href
                }
                prefetch={
                  link.section && pathname === link.href ? false : undefined
                }
                onNavigate={(event) => {
                  if (link.section && pathname === link.href) {
                    event.preventDefault();
                    navigateCatalogSection(link.section);
                  }
                }}
                aria-current={
                  pathname === link.href &&
                  (!link.section || currentSection === link.section)
                    ? "page"
                    : undefined
                }
              >
                <Icon name={link.icon} />
                {link.label}
              </Link>
            ))}
          </div>
        ))}
        <p className="admin-navigation-help">
          {preview
            ? "Panel de prueba. Datos guardados en este navegador."
            : "Acceso privado · Administrador STYLO"}
        </p>
      </details>
    </nav>
  );
}

export function PreviewFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const management = [
    "/vista-previa/gestion",
    "/vista-previa/promociones",
    "/vista-previa/pedidos",
  ].includes(pathname);
  return management ? (
    <div className="admin-shell admin-preview">
      <div className="admin-workspace">
        <AdminNavigation preview />
        <div className="admin-main">{children}</div>
      </div>
    </div>
  ) : (
    <>{children}</>
  );
}
