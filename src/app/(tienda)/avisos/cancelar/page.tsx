import type { Metadata } from "next";
import Link from "next/link";
import { cancelRestockAlert } from "@/modules/commerce/restock-actions";

export const metadata: Metadata = {
  title: "Cancelar aviso de reposición",
  robots: { index: false, follow: false },
};

export default async function CancelRestockPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; estado?: string }>;
}) {
  const { token, estado } = await searchParams;
  return (
    <section className="container interior-page restock-page">
      <p className="eyebrow">AVISO DE REPOSICIÓN</p>
      <h1>Cancelar aviso.</h1>
      {estado === "ok" ? (
        <p role="status">El aviso quedó cancelado.</p>
      ) : estado ? (
        <p role="alert">No encontramos un aviso pendiente para este enlace.</p>
      ) : token ? (
        <form action={cancelRestockAlert} className="restock-request-form">
          <input type="hidden" name="token" value={token} />
          <p>No te enviaremos el aviso de reposición si cancelás la solicitud.</p>
          <button className="button button-gold" type="submit">
            Cancelar solicitud
          </button>
        </form>
      ) : (
        <p role="alert">Falta el enlace de cancelación.</p>
      )}
      <Link className="text-link" href="/catalogo">Volver a la tienda</Link>
    </section>
  );
}
