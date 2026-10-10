import Link from "next/link";

export default function NotFound() {
  return <main id="contenido" className="not-found"><p className="eyebrow">STYLO / 404</p><h1>Esta página<br />no está acá.</h1><p>Volvé al inicio para seguir explorando.</p><Link className="button button-gold" href="/">Volver al inicio</Link></main>;
}
