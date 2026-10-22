import type { Metadata } from "next";
import Link from "next/link";
import { confirmRestockAlert } from "@/modules/commerce/restock-actions";

export const metadata: Metadata = {
  title: "Confirmar aviso de reposición",
  robots: { index: false, follow: false },
};

export default async function ConfirmRestockPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; estado?: string }>;
}) {
  const { token, estado } = await searchParams;
  return (
    <section className="container interior-page restock-page">
      <p className="eyebrow">AVISO DE REPOSICIÓN</p>
      <h1>Confirmá tu correo.</h1>
      {estado === "ok" ? (
        <p role="status">Listo. Te avisaremos una vez si vuelve esa presentación.</p>
      ) : estado ? (
        <p role="alert">
          No pudimos confirmar el aviso. El enlace puede haber vencido o ya haberse usado.
        </p>
      ) : token ? (
        <form action={confirmRestockAlert} className="restock-request-form">
          <input type="hidden" name="token" value={token} />
          <p>Activá el aviso solicitado para esa presentación.</p>
          <button className="button button-gold" type="submit">
            Confirmar aviso
          </button>
        </form>
      ) : (
        <p role="alert">Falta el enlace de confirmación.</p>
      )}
      <Link className="text-link" href="/catalogo">Volver a la tienda</Link>
    </section>
  );
}
