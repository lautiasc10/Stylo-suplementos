import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contacto" };
export default function ContactPage() {
  return <section className="container interior-page"><p className="eyebrow">CERCA TUYO</p><h1>Conectá con STYLO.</h1><p className="page-intro">Rosario, Argentina.</p><div className="empty-state"><h2>Pronto, nuestros<br />canales oficiales.</h2><p>Los datos de contacto y las condiciones de retiro se publicarán antes de la apertura.</p><Link href="/" className="button button-outline">Volver al inicio</Link></div></section>;
}
