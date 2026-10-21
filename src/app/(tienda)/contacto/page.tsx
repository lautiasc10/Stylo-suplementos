import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

import { pageMetadata } from "@/modules/seo/metadata";
import { getEnvironment } from "@/lib/config/server";
export function generateMetadata() {
  return pageMetadata({
    title: "Contacto",
    description:
      "STYLO Suplementos, Rosario, Argentina. Los canales oficiales y las condiciones de retiro se publicarán antes de la apertura.",
    path: "/contacto",
    siteUrl: getEnvironment().siteUrl,
  });
}
export default function ContactPage() {
  return (
    <Reveal as="section" enterOnMount className="container interior-page">
      <p className="eyebrow">CERCA TUYO</p>
      <h1>Conectá con STYLO.</h1>
      <p className="page-intro">Rosario, Argentina.</p>
      <div className="empty-state">
        <h2>
          Pronto, nuestros
          <br />
          canales oficiales.
        </h2>
        <p>
          Los datos de contacto y las condiciones de retiro se publicarán antes
          de la apertura.
        </p>
        <Link href="/" className="button button-outline">
          Volver al inicio
        </Link>
      </div>
    </Reveal>
  );
}
