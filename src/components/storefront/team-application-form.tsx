"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitTeamApplication } from "@/modules/storefront/team-actions";
import { addTeamPreview } from "@/modules/storefront/team-preview";
import {
  teamKinds,
  teamSuccess,
  validateTeamInput,
  type TeamInput,
  type TeamRequestState,
} from "@/modules/storefront/team";

const initial: TeamRequestState = { status: "idle", message: "" };
async function submitPreview(
  _previous: TeamRequestState,
  form: FormData,
): Promise<TeamRequestState> {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const input: TeamInput = {
    kind: text("kind") as TeamInput["kind"],
    name: text("name"),
    email: text("email").toLowerCase(),
    instagram: text("instagram"),
    discipline: text("discipline"),
    message: text("message"),
    consent: form.get("consent") === "on",
  };
  const error = validateTeamInput(input);
  if (error) return { status: "error", message: error, values: input };
  try {
    addTeamPreview(input);
    return {
      status: "success",
      message:
        "Consulta de prueba guardada en este navegador. Podés verla en el panel de prueba; no se envió a STYLO.",
    };
  } catch {
    return {
      status: "error",
      message: "No pudimos guardar el ejemplo en este navegador.",
      values: input,
    };
  }
}

export function TeamApplicationForm({
  available = false,
  preview = false,
}: {
  available?: boolean;
  preview?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [state, action, pending] = useActionState(
    preview ? submitPreview : submitTeamApplication,
    initial,
    preview ? undefined : "/#atletas",
  );
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (state.status === "success") confirmation.current?.focus();
  }, [state.status]);
  const enabled = available || preview;
  if (state.status === "success")
    return (
      <div
        ref={confirmation}
        tabIndex={-1}
        className="home-team-confirmation"
        role="status"
      >
        <h3>Gracias por escribirnos.</h3>
        <p>{preview ? state.message : teamSuccess}</p>
        <Link
          className="home-athlete-cta"
          href={preview ? "/vista-previa/atletas" : "/catalogo"}
        >
          {preview
            ? "Ver consulta en el panel de prueba"
            : "Explorar la tienda"}
        </Link>
      </div>
    );
  return (
    <div className="home-athlete-application">
      {preview && (
        <p className="preview-notice">
          Vista previa · Usá datos ficticios. Las consultas quedan solo en este
          navegador.
        </p>
      )}
      {!enabled && (
        <p className="home-team-unavailable" role="status">
          El formulario de consultas del Team no está disponible en este
          momento.
        </p>
      )}
      <form
        action={action}
        className="home-team-form"
        hidden={preview && !ready}
        aria-describedby="team-form-purpose"
        aria-busy={pending}
      >
        <fieldset disabled={!enabled || pending}>
          <legend className="sr-only">Consulta de atletas y profesores</legend>
          <label className="home-team-wide">
            Consulto como
            <select name="kind" defaultValue={state.values?.kind ?? "athlete"}>
              {Object.entries(teamKinds).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nombre y apellido
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={state.values?.name ?? ""}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              defaultValue={state.values?.email ?? ""}
            />
          </label>
          <label>
            Disciplina o actividad
            <input
              name="discipline"
              required
              minLength={2}
              maxLength={120}
              defaultValue={state.values?.discipline ?? ""}
            />
          </label>
          <label>
            <span className="home-team-label">
              Instagram <small>(opcional)</small>
            </span>
            <input
              name="instagram"
              autoComplete="off"
              maxLength={80}
              placeholder="@tu.perfil"
              defaultValue={state.values?.instagram ?? ""}
            />
          </label>
          <label className="home-team-wide">
            <span className="home-team-label">
              Contanos sobre vos <small>(opcional)</small>
            </span>
            <textarea
              name="message"
              maxLength={2000}
              rows={3}
              defaultValue={state.values?.message ?? ""}
            />
          </label>
          <div className="sr-only" aria-hidden="true">
            <label>
              Dejá este campo vacío
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="home-team-consent home-team-wide">
            <input
              name="consent"
              type="checkbox"
              required
              defaultChecked={state.values?.consent ?? false}
            />
            Acepto que STYLO use estos datos para responder y gestionar mi
            consulta.
          </label>
          <p
            id="team-form-purpose"
            className="home-team-purpose home-team-wide"
          >
          Usaremos tus datos para responder esta consulta. No te suscribe a
          publicidad.
          </p>
          {state.status === "error" && (
            <p className="home-team-wide form-message" role="alert">
              {state.message}
            </p>
          )}
          <button className="home-athlete-cta home-team-wide" type="submit">
            {pending ? "Guardando consulta…" : "Enviar consulta al Team"}
          </button>
        </fieldset>
      </form>
      {preview && (
        <noscript>
          <p>La vista previa del formulario requiere JavaScript.</p>
        </noscript>
      )}
    </div>
  );
}
