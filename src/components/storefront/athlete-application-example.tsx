"use client";

import { useEffect, useState } from "react";

export function AthleteApplicationExample() {
  const [preview, setPreview] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <div className="home-athlete-application">
      <p className="home-athlete-example" id="athlete-example-notice">
        Formulario de ejemplo. No envía ni guarda tus datos.
      </p>
      {preview ? (
        <div className="home-athlete-demo-confirmation" role="status">
          <p>¡Así empieza tu camino con STYLO!</p>
          <span>
            Probaste el formulario de ejemplo. Tu postulación no fue enviada.
          </span>
          <button type="button" onClick={() => setPreview(false)}>
            Volver al formulario
          </button>
        </div>
      ) : (
        <form
          hidden={!ready}
          className="home-athlete-form"
          aria-describedby="athlete-example-notice"
          onSubmit={(event) => {
            event.preventDefault();
            setPreview(true);
          }}
        >
          <label>
            <span className="sr-only">Nombre y apellido</span>
            <input
              required
              name="name"
              autoComplete="name"
              maxLength={120}
              placeholder="Nombre y apellido"
            />
          </label>
          <label>
            <span className="sr-only">Instagram</span>
            <input
              required
              name="instagram"
              autoComplete="off"
              maxLength={80}
              placeholder="@instagram"
            />
          </label>
          <label>
            <span className="sr-only">Disciplina</span>
            <input
              required
              name="discipline"
              maxLength={120}
              placeholder="Disciplina (powerlifting, crossfit…)"
            />
          </label>
          <label>
            <span className="sr-only">Email</span>
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              placeholder="Mail"
            />
          </label>
          <button className="home-athlete-cta" type="submit">
            Quiero ser parte
          </button>
        </form>
      )}
      {!ready && (
        <p>
          La demostración del formulario requiere JavaScript. Los canales de
          postulación se publicarán próximamente.
        </p>
      )}
    </div>
  );
}
