import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getEnvironment } from "@/lib/config/server";
import { PreviewFrame } from "@/components/admin/navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Vista previa local",
  robots: { index: false, follow: false },
};
export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers(),
    host = requestHeaders.get("host") ?? "",
    environment = getEnvironment();
  if (
    environment.environment !== "local" ||
    !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(environment.siteUrl.hostname)
  )
    notFound();
  return (
    <section className="container interior-page">
      <nav className="preview-links" aria-label="Vista previa">
        <Link href="/vista-previa">Catálogo de prueba</Link>
        <Link href="/vista-previa/gestion">Gestión de prueba</Link>
        <Link href="/vista-previa/promociones">Promociones de prueba</Link>
        <Link href="/vista-previa/ofertas">Vista de promociones</Link>
        <Link href="/vista-previa/pedidos">Pedidos de prueba</Link>
        <Link href="/">Volver a la tienda</Link>
      </nav>
      <PreviewFrame>{children}</PreviewFrame>
    </section>
  );
}
