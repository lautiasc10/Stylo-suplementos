import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { AthleteApplicationExample } from "./athlete-application-example";

// Reference benefits and the form are explicitly examples until defined by STYLO.
export function AthleteCall() {
  return (
    <section
      id="atletas"
      tabIndex={-1}
      className="home-athlete-call"
      aria-labelledby="athlete-title"
    >
      <div className="reference-container home-athlete-grid">
        <div className="home-athlete-photos" aria-hidden="true">
          <Reveal className="home-athlete-photo" delay={0}>
            <Image
              src="/reference/goal-perform.jpg"
              alt=""
              width={768}
              height={1024}
              sizes="(min-width: 960px) 340px, 52vw"
              quality={85}
            />
          </Reveal>
          <Reveal className="home-athlete-photo" delay={0.2}>
            <Image
              src="/reference/goal-recover.jpg"
              alt=""
              width={768}
              height={1024}
              sizes="(min-width: 960px) 340px, 52vw"
              quality={85}
            />
          </Reveal>
          <span className="home-athlete-team">Team</span>
        </div>
        <div className="home-athlete-copy">
          <p className="reference-eyebrow">Team STYLO</p>
          <h2 id="athlete-title">
            ¿Sos atleta? <span className="reference-text-gold">Sumate</span>
          </h2>
          <p>
            Buscamos gente que entrene en serio y quiera representar a la marca.
            Competís, das clases o creás contenido: contanos.
          </p>
          <p className="home-athlete-example">
            Beneficios de ejemplo · A confirmar por STYLO
          </p>
          <ul>
            {[
              "Suplementos todos los meses",
              "Código de descuento propio",
              "Contenido y eventos STYLO",
              "Comisión por cada venta",
            ].map((item) => (
              <li key={item}>
                <span aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <AthleteApplicationExample />
        </div>
      </div>
    </section>
  );
}
