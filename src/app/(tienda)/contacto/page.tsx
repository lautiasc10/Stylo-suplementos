import Link from "next/link";
import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/icon";
import { contactChannels, storeContact } from "@/modules/storefront/contact";
import "../../contact-stylo.css";

import { pageMetadata } from "@/modules/seo/metadata";
import { getEnvironment } from "@/lib/config/server";
export function generateMetadata() {
  return pageMetadata({
    title: "Contacto",
    description:
      "Contactá a STYLO Suplementos en Rosario por WhatsApp, email, Instagram o Facebook. Consultas sobre productos, compras y colaboraciones.",
    path: "/contacto",
    siteUrl: getEnvironment().siteUrl,
  });
}
export default function ContactPage() {
  return (
    <div className="contact-stylo">
      <section className="contact-stylo-hero" aria-labelledby="contact-title">
        <div className="contact-stylo-copy">
          <p className="reference-eyebrow">CERCA TUYO · STYLO SUPLEMENTOS</p>
          <h1 id="contact-title">Conectá<br />con <span>STYLO.</span></h1>
          <p className="contact-stylo-lead">Detrás de cada consulta, hay una persona. Hablemos de productos, presentaciones y lo que necesitás para tu próxima compra.</p>
          <p className="contact-stylo-location"><Icon name="pin" />{storeContact.location}</p>
          <a className="button button-gold" href={storeContact.whatsapp} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp <Icon name="arrow" /></a>
        </div>
        <div className="contact-stylo-photo">
          <Image src="/about/stylo-team-portrait.webp" alt="Integrantes de STYLO Suplementos" fill priority sizes="(min-width: 960px) 45vw, 100vw" />
          <span>PERSONAS REALES. CONTACTO DIRECTO.</span>
        </div>
      </section>
      <section className="contact-stylo-channels" aria-labelledby="contact-channels-title">
        <Reveal className="contact-stylo-section-heading"><p className="reference-eyebrow">ELEGÍ TU CANAL</p><h2 id="contact-channels-title">Estamos del <span>otro lado.</span></h2></Reveal>
        <RevealGroup className="contact-stylo-channel-grid">
          {contactChannels.map((channel, index) => <RevealItem key={channel.name}>
            <a className="contact-stylo-channel" href={channel.href} target={channel.external ? "_blank" : undefined} rel={channel.external ? "noopener noreferrer" : undefined}>
              <span className="contact-stylo-channel-number" aria-hidden="true">0{index + 1}</span><h3>{channel.name}</h3><p>{channel.value}</p><span className="contact-stylo-channel-action">{channel.action}<Icon name="arrow" /></span>
            </a>
          </RevealItem>)}
        </RevealGroup>
      </section>
      <Reveal as="section" className="contact-stylo-bottom" aria-labelledby="contact-team-title">
        <div><p className="reference-eyebrow">TEAM STYLO</p><h2 id="contact-team-title">¿Sos atleta<br />o <span>profe?</span></h2><p>Contanos sobre tu disciplina y tu actividad desde el formulario de consultas del Team.</p></div>
        <Link className="button button-outline" href="/#atletas">Conocer Team STYLO <Icon name="arrow" /></Link>
      </Reveal>
    </div>
  );
}
