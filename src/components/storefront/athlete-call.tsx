import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { TeamApplicationForm } from "./team-application-form";

export function AthleteCall({ available = false, preview = false }: { available?: boolean; preview?: boolean }) {
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
            ¿Sos atleta o profe? <span className="reference-text-gold">Conectemos.</span>
          </h2>
          <p>
            Competís, das clases o acompañás a otros a entrenar: queremos conocerte.
            Contanos sobre tu actividad y conversemos sobre una posible colaboración.
          </p>
          <ul>
            {[
              "Tu disciplina y tu recorrido",
              "Tu actividad como profe o atleta",
              "Tu perfil y tu comunidad",
              "Tu propuesta de colaboración",
            ].map((item) => (
              <li key={item}>
                <span aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <TeamApplicationForm available={available} preview={preview} />
        </div>
      </div>
    </section>
  );
}
