import Image from "next/image";
import Link from "next/link";
import { CATALOG_GOALS } from "@/modules/catalog/goals";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";

export function ReferenceGoals() {
  return (
    <section
      id="objetivos"
      className="reference-goals"
      aria-labelledby="goals-title"
    >
      <div className="reference-container">
        <Reveal className="reference-section-heading">
          <div>
            <p className="reference-eyebrow">Encontrá lo tuyo</p>
            <h2 id="goals-title">
              Elegí tu <span className="reference-text-gold">objetivo</span>
            </h2>
          </div>
          <p>
            Explorá las categorías de suplementos según lo que buscás para tu
            rutina.
          </p>
        </Reveal>
        <RevealGroup className="reference-goal-grid">
          {CATALOG_GOALS.map((goal) => (
            <RevealItem key={goal.slug}>
              <Link
                href={`/catalogo?objetivo=${goal.slug}`}
                className="reference-goal-card"
              >
                <Image
                  className="reference-goal-photo reference-goal-gray"
                  src={goal.image}
                  alt=""
                  fill
                  sizes="(min-width: 960px) 420px, (min-width: 640px) 50vw, 100vw"
                  quality={85}
                />
                <Image
                  className="reference-goal-photo reference-goal-color"
                  src={goal.image}
                  alt=""
                  fill
                  sizes="(min-width: 960px) 420px, (min-width: 640px) 50vw, 100vw"
                  quality={85}
                />
                <span className="reference-goal-shade" aria-hidden="true" />
                <div className="reference-goal-copy">
                  <span className="reference-goal-number">{goal.number}</span>
                  <h3>{goal.name}</h3>
                  <div className="reference-goal-details">
                    <p>{goal.description}</p>
                    <div className="reference-goal-tags">
                      {goal.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <span className="reference-goal-action">
                    Ver productos <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
