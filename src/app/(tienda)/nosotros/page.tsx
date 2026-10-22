import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { heroBody, heroDisplay } from "@/components/storefront/hero-fonts";
import { pageMetadata } from "@/modules/seo/metadata";
import { getEnvironment } from "@/lib/config/server";
import "../../about-stylo.css";

export function generateMetadata() {
  return pageMetadata({
    title: "Sobre STYLO",
    description:
      "Conocé STYLO Suplementos, una marca de Rosario vinculada al deporte, el bienestar y la constancia.",
    path: "/nosotros",
    siteUrl: getEnvironment().siteUrl,
  });
}

const ideas = [
  {
    number: "01",
    title: "Constancia",
    text: "Cada objetivo se construye con tiempo, entrenamiento y decisiones sostenidas.",
  },
  {
    number: "02",
    title: "Claridad",
    text: "Creemos en la información clara para elegir lo que acompaña cada rutina.",
  },
  {
    number: "03",
    title: "Confianza",
    text: "Queremos que la experiencia de compra esté a la altura de cada elección.",
  },
];

export default function AboutPage() {
  return (
    <div className={`about-stylo ${heroDisplay.variable} ${heroBody.variable}`}>
      <section className="about-stylo-hero" aria-labelledby="about-stylo-title">
        <div className="about-stylo-hero-photo">
          <Image
            src="/about/stylo-team-portrait.webp"
            alt="Dos integrantes de STYLO Suplementos con prendas de la marca"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 54vw"
          />
        </div>
        <div className="about-stylo-hero-inner">
          <div className="about-stylo-hero-copy">
            <p className="about-stylo-eyebrow"><span /> STYLO SUPLEMENTOS · ROSARIO</p>
            <h1 id="about-stylo-title">
              Una marca.<br />
              Tu mejor<br />
              <span>versión.</span>
            </h1>
            <p className="about-stylo-lead">
              STYLO nace en Rosario con una identidad vinculada al deporte, el
              bienestar y el acompañamiento responsable de objetivos personales.
            </p>
            <Link className="about-stylo-text-link" href="#nuestra-idea">
              Conocé nuestra idea <span aria-hidden="true">↘</span>
            </Link>
          </div>
          <p className="about-stylo-photo-caption">PERSONAS REALES · IDENTIDAD STYLO</p>
        </div>
      </section>

      <section id="nuestra-idea" className="about-stylo-ideas" aria-labelledby="about-ideas-title">
        <div className="about-stylo-container">
          <Reveal className="about-stylo-ideas-intro">
            <div>
              <p className="about-stylo-eyebrow"><span /> NUESTRA IDEA</p>
              <h2 id="about-ideas-title">El camino también <em>importa.</em></h2>
            </div>
            <p>
              Creemos en la constancia, la información clara y una experiencia de
              compra construida sobre confianza.
            </p>
          </Reveal>
          <RevealGroup className="about-stylo-ideas-grid">
            {ideas.map((idea) => (
              <RevealItem className="about-stylo-idea" key={idea.number}>
                <span className="about-stylo-idea-number">{idea.number}</span>
                <h3>{idea.title}</h3>
                <p>{idea.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="about-stylo-story" aria-labelledby="about-story-title">
        <Reveal className="about-stylo-story-photo" direction="left">
          <Image
            src="/about/stylo-team-walk.webp"
            alt="Dos integrantes de STYLO caminando con el león dorado de la marca en sus prendas"
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <span>STYLO · ROSARIO, ARGENTINA</span>
        </Reveal>
        <Reveal className="about-stylo-story-copy" direction="right">
          <p className="about-stylo-eyebrow"><span /> DETRÁS DE STYLO</p>
          <h2 id="about-story-title">Una identidad que se lleva puesta.</h2>
          <p>
            Nuestra selección reúne suplementos de distintas marcas y accesorios
            para el entrenamiento. Queremos que encontrar lo que buscás sea tan
            claro como el objetivo que te mueve.
          </p>
          <p>
            Fuerza, disciplina y evolución son parte de la identidad que
            construimos día a día.
          </p>
          <Link className="about-stylo-text-link" href="/catalogo">
            Explorar la tienda <span aria-hidden="true">↗</span>
          </Link>
        </Reveal>
      </section>

      <section className="about-stylo-close" aria-labelledby="about-close-title">
        <div className="about-stylo-container">
          <Reveal>
            <p className="about-stylo-eyebrow"><span /> EL SIGUIENTE PASO</p>
            <h2 id="about-close-title">Potenciá tu <em>mejor versión.</em></h2>
            <div className="about-stylo-actions">
              <Link className="about-stylo-primary" href="/catalogo">Explorar tienda <span aria-hidden="true">↗</span></Link>
              <Link className="about-stylo-secondary" href="/#atletas">Conocer Team STYLO <span aria-hidden="true">↗</span></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
