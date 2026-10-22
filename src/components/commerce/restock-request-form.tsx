"use client";

import { useActionState } from "react";
import {
  requestRestockAlert,
  type RestockRequestState,
} from "@/modules/commerce/restock-actions";

const initial: RestockRequestState = { status: "idle", message: "" };

export function RestockRequestForm({
  variantId,
  available,
}: {
  variantId: string;
  available: boolean;
}) {
  const [state, action, pending] = useActionState(
    requestRestockAlert,
    initial,
    `/avisos/solicitar?variante=${encodeURIComponent(variantId)}`,
  );
  return (
    <form className="restock-request-form" action={action}>
      <input type="hidden" name="variantId" value={variantId} />
      <div className="restock-honeypot" aria-hidden="true">
        <label htmlFor="restock-website">Sitio web</label>
        <input
          id="restock-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <label htmlFor="restock-email">Tu correo electrónico</label>
      <input
        id="restock-email"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        required
        disabled={!available || pending}
      />
      <p>
        Te enviaremos un enlace para confirmar tu correo. Después, recibirás
        un único aviso cuando vuelva esta presentación. Podés cancelar la
        solicitud desde ese mensaje.
      </p>
      <button
        className="button button-gold"
        type="submit"
        disabled={!available || pending}
      >
        {pending ? "Enviando…" : "Confirmar solicitud"}
      </button>
      {!available && (
        <p role="status">Los avisos por email todavía no están habilitados.</p>
      )}
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
