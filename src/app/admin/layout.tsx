import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/storefront/brand-mark";
import { AdminNavigation } from "@/components/admin/navigation";
import { AdminWorkspaceScope } from "@/components/admin/workspace-navigation";
import { adminDisplay, adminBody } from "@/components/admin/admin-fonts";
import "../commerce.css";
import "../admin-premium.css";
import "../admin-auth.css";


export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`admin-shell ${adminDisplay.variable} ${adminBody.variable}`}>
      <header className="admin-header">
        <Link
          href="/"
          className="brand-link"
          aria-label="Stylo Suplementos, volver a la tienda"
        >
          <BrandMark />
        </Link>
        <Link href="/" className="text-link">
          Volver a la tienda
        </Link>
      </header>
      <AdminWorkspaceScope>
        <div className="admin-workspace">
          <AdminNavigation />
          <main id="contenido" className="admin-main">
            {children}
          </main>
        </div>
      </AdminWorkspaceScope>
    </div>
  );
}
