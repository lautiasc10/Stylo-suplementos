import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AdminNavigation } from "@/components/admin/navigation";
import "../commerce.css";

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
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/" className="brand-link">
          <Image
            src="/branding/logo-principal.webp"
            width={60}
            height={60}
            alt="STYLO, volver al inicio"
          />
          <span className="brand-name brand-caption">
            Administración<span>STYLO SUPLEMENTOS</span>
          </span>
        </Link>
        <Link href="/" className="text-link">
          Volver a la tienda
        </Link>
      </header>
      <div className="admin-workspace">
        <AdminNavigation />
        <main id="contenido" className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}
