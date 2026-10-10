"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="contenido" className="not-found"><p className="eyebrow">STYLO</p><h1>No pudimos cargar<br />esta página.</h1><p>Intentá nuevamente en unos momentos.</p><button onClick={reset} className="button button-gold">Reintentar</button></main>;
}
