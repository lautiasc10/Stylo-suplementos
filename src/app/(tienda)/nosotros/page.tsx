import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";

import { pageMetadata } from "@/modules/seo/metadata";
import { getEnvironment } from "@/lib/config/server";
export function generateMetadata() {
  return pageMetadata({
    title: "Sobre STYLO",
    description:
      "Conocé STYLO Suplementos, una marca de Rosario vinculada al deporte, el bienestar y la constancia.",
    path: "/nosotros",
    siteUrl: getEnvironment().siteUrl,
  });
}
export default function AboutPage() {
  return (
    <section className="container interior-page about-grid">
      <Reveal direction="left" enterOnMount>
        <p className="eyebrow">FUERZA · DISCIPLINA · EVOLUCIÓN</p>
        <h1>
          Una marca.
          <br />
          Tu mejor versión.
        </h1>
        <p className="page-intro">
          STYLO nace en Rosario con una identidad vinculada al deporte, el
          bienestar y el acompañamiento responsable de objetivos personales.
        </p>
        <p>
          Creemos en la constancia, la información clara y una experiencia de
          compra construida sobre confianza. Nuestra selección reunirá productos
          de distintas marcas y accesorios para el entrenamiento.
        </p>
        <p className="about-slogan">POTENCIÁ TU MEJOR VERSIÓN.</p>
      </Reveal>
      <Reveal direction="right" enterOnMount>
        <Image
          src="/branding/stylo-suplementos.svg"
          alt="STYLO Suplementos"
          width={981}
          height={236}
          unoptimized
        />
      </Reveal>
    </section>
  );
}
