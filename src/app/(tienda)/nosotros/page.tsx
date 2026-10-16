import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "Sobre STYLO" };
export default function AboutPage() {
  return (
    <section className="container interior-page about-grid">
      <div>
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
      </div>
      <Image
        src="/branding/stylo-suplementos.svg"
        alt="STYLO Suplementos"
        width={981}
        height={236}
        unoptimized
      />
    </section>
  );
}
