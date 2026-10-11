"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export function AdminNavigation() {
  const pathname = usePathname();
  if (pathname === "/admin/login" || pathname.startsWith("/admin/mfa"))
    return null;
  return (
    <nav className="admin-navigation" aria-label="Administración">
      <p className="eyebrow">GESTIÓN DE LA TIENDA</p>
      {[
        ["/admin", "Resumen", "shield"],
        ["/admin/catalogo", "Catálogo e inventario", "bag"],
        ["/admin/promociones", "Promociones", "bolt"],
        ["/admin/pedidos", "Ventas y retiros", "cart"],
      ].map(([href, label, icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          <Icon name={icon as "shield" | "bag" | "bolt" | "cart"} />
          {label}
        </Link>
      ))}
      <p className="admin-navigation-help">
        Productos, precios y ventas en un solo lugar.
      </p>
    </nav>
  );
}
