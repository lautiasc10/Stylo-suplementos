"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/storefront/brand-mark";
import { signOut } from "@/modules/admin/actions";
import { adminDisplay, adminBody } from "./admin-fonts";
import {
  AdminWorkspaceScope,
  useWorkspaceNavigation,
  workspacePaths,
  navigateWorkspace,
} from "./workspace-navigation";
import {
  catalogSection,
  navigateCatalogSection,
} from "@/components/catalog/section-navigation";

export function AdminNavigation({ preview = false }: { preview?: boolean }) {
  const { ready } = useWorkspaceNavigation();
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
        <div className="admin-nav-content">
        <div className="admin-premium-brand"><BrandMark /><span>Panel de administración</span></div>
        <Link
            href={preview ? "/vista-previa/resumen" : "/admin"}
            prefetch={ready ? false : undefined}
            onNavigate={(event) => {
              if (ready) {
                event.preventDefault();
                navigateWorkspace(preview ? "/vista-previa/resumen" : "/admin");
              }
            }}
            aria-current={pathname === (preview ? "/vista-previa/resumen" : "/admin") ? "page" : undefined}
          >
            <Icon name="shield" />
            Resumen
        </Link>
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
                  ready || (link.section && pathname === link.href)
                    ? false
                    : undefined
                }
                onNavigate={(event) => {
                  if (ready && workspacePaths(preview).includes(link.href)) {
                    event.preventDefault();
                    navigateWorkspace(link.href, link.section);
                    return;
                  }
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
        <div className="admin-premium-sidebar-bottom">
          {preview && <p className="admin-navigation-help">Panel de prueba. Datos guardados en este navegador.</p>}
          <Link href="/" className="admin-premium-store-link"><Icon name="bag" /> Ver la tienda</Link>
          {!preview && <form action={signOut}><button type="submit"><Icon name="back" /> Cerrar sesión</button></form>}
        </div>
        </div>
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
    "/vista-previa/resumen",
  ].includes(pathname);
  return management ? (
    <div className={`admin-shell admin-preview ${adminDisplay.variable} ${adminBody.variable}`}>
      <AdminWorkspaceScope>
        <div className="admin-workspace">
          <AdminNavigation preview />
          <div className="admin-main">{children}</div>
        </div>
      </AdminWorkspaceScope>
    </div>
  ) : (
    <>{children}</>
  );
}
