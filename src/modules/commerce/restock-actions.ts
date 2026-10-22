"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { restockDb } from "./restock-db";
import { dispatchRestockAlerts } from "./restock-dispatch";
import {
  restockMailConfig,
  restockUrl,
  sendRestockMail,
} from "./restock-mail";

export type RestockRequestState = {
  status: "idle" | "ok" | "error";
  message: string;
};

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestRestockAlert(
  _previous: RestockRequestState,
  form: FormData,
): Promise<RestockRequestState> {
  // A hidden field catches unsophisticated automated submissions without
  // disclosing whether an address is already subscribed.
  if (String(form.get("website") ?? "").trim())
    return {
      status: "ok",
      message: "Si el correo corresponde a una presentación agotada, recibirás un enlace para confirmar el aviso.",
    };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const variantId = String(form.get("variantId") ?? "");
  if (!uuid.test(variantId) || email.length > 254 || !emailPattern.test(email))
    return { status: "error", message: "Revisá la dirección de correo." };
  const config = restockMailConfig();
  const client = restockDb();
  if (!config || !client)
    return {
      status: "error",
      message: "Los avisos por email todavía no están disponibles.",
    };
  const token = randomBytes(32).toString("base64url");
  const hash = tokenHash(token);
  const { data: accepted, error } = await client.rpc("request_restock_alert", {
    p_variant_id: variantId,
    p_email: email,
    p_token_hash: hash,
  });
  if (error)
    return {
      status: "error",
      message: "No pudimos registrar el aviso. Probá de nuevo más tarde.",
    };
  if (accepted) {
    const confirm = restockUrl(config, "/avisos/confirmar", token);
    const cancel = restockUrl(config, "/avisos/cancelar", token);
    try {
      await sendRestockMail(config, {
        to: email,
        key: `restock-confirm-${hash}`,
        subject: "Confirmá tu aviso de reposición | STYLO",
        text: `Pediste un aviso cuando vuelva una presentación de STYLO Suplementos.\n\nConfirmá tu correo para activar el aviso: ${confirm}\n\nSi no pediste esto, ignorá el mensaje. También podés cancelar la solicitud: ${cancel}\n\nEste aviso corresponde solo a esa presentación y se enviará una vez.`,
      });
    } catch {
      // The mail provider did not accept the confirmation. Let the visitor
      // retry immediately rather than keeping a dead 15-minute throttle.
      await client.rpc("abandon_restock_request", { p_token_hash: hash });
      return {
        status: "error",
        message: "No pudimos enviar el correo de confirmación. Probá de nuevo más tarde.",
      };
    }
  }
  return {
    status: "ok",
    message: "Si el correo corresponde a una presentación agotada, recibirás un enlace para confirmar el aviso.",
  };
}

export async function confirmRestockAlert(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    redirect("/avisos/confirmar?estado=invalido");
  const client = restockDb();
  if (!client) redirect("/avisos/confirmar?estado=error");
  const { data, error } = await client.rpc("confirm_restock_alert", {
    p_token_hash: tokenHash(token),
  });
  if (data && !error && restockMailConfig()) {
    after(async () => {
      try {
        await dispatchRestockAlerts(client);
      } catch {
        console.error("No pudimos procesar un aviso confirmado.");
      }
    });
  }
  redirect(
    `/avisos/confirmar?estado=${error ? "error" : data ? "ok" : "invalido"}`,
  );
}

export async function cancelRestockAlert(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    redirect("/avisos/cancelar?estado=invalido");
  const client = restockDb();
  if (!client) redirect("/avisos/cancelar?estado=error");
  const { data, error } = await client.rpc("cancel_restock_alert", {
    p_token_hash: tokenHash(token),
  });
  redirect(
    `/avisos/cancelar?estado=${error ? "error" : data ? "ok" : "invalido"}`,
  );
}
