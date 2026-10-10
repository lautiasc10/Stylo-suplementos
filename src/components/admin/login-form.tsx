"use client";

import { useActionState } from "react";
import { signIn } from "@/modules/admin/actions";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return <form action={action} className="form-stack">
    <label htmlFor="email">Correo electrónico</label>
    <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} disabled={!configured || pending} />
    <label htmlFor="password">Contraseña</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} disabled={!configured || pending} />
    <p role="alert" className="form-message">{state.error}</p>
    <button className="button button-gold" disabled={!configured || pending}>{pending ? "Verificando…" : "Ingresar"}</button>
  </form>;
}
