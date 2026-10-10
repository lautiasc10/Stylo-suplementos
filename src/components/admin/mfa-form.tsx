"use client";

import { useActionState, useState, useTransition } from "react";
import { enrollAuthenticator, verifyAuthenticator } from "@/modules/admin/actions";

export function MfaForm({ existingFactor }: { existingFactor?: string }) {
  const [factorId, setFactorId] = useState(existingFactor ?? "");
  const [qr, setQr] = useState("");
  const [enrollmentError, setEnrollmentError] = useState("");
  const [enrolling, startEnrollment] = useTransition();
  const [state, action, pending] = useActionState(verifyAuthenticator, { error: "" });
  function enroll() {
    startEnrollment(async () => {
      const result = await enrollAuthenticator();
      if (result.error) { setEnrollmentError(result.error); return; }
      if (result.factorId && result.qrCode) { setFactorId(result.factorId); setQr(result.qrCode); }
    });
  }
  return <div className="form-stack">
    {!existingFactor && !qr && <button type="button" className="button button-outline" onClick={enroll} disabled={enrolling}>{enrolling ? "Preparando…" : "Configurar autenticador"}</button>}
    {qr && <><p>Escaneá este QR con tu aplicación de autenticación y escribí el código que aparece.</p><img className="mfa-qr" src={qr.startsWith("data:") ? qr : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} alt="QR para configurar tu autenticador de STYLO" width={220} height={220} /></>}
    <p role="alert">{enrollmentError}</p>
    {factorId && <form action={action} className="form-stack">
      <input type="hidden" name="factorId" value={factorId} />
      <label htmlFor="code">Código de seis dígitos</label>
      <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={pending} />
      <p role="alert" className="form-message">{state.error}</p>
      <button className="button button-gold" disabled={pending}>{pending ? "Verificando…" : "Verificar acceso"}</button>
    </form>}
  </div>;
}
