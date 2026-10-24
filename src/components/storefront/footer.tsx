import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { HomeLink } from "./home-link";
import { Reveal } from "@/components/ui/Reveal";
import { storeContact } from "@/modules/storefront/contact";

export function Footer() {
  return (
    <Reveal as="footer" direction="none" className="site-footer">
      <div className="container footer-inner">
        <div>
          <HomeLink>
            <BrandMark />
          </HomeLink>
          <p>Potenciá tu mejor versión.</p>
        </div>
        <nav aria-label="Navegación del pie">
          <Link href="/catalogo">Tienda</Link>
          <Link href="/nosotros">Sobre STYLO</Link>
          <Link href="/contacto">Contacto</Link>
          <a href={storeContact.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={storeContact.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </nav>
        <p className="footer-location">
          Rosario, Argentina
          <br />© {new Date().getFullYear()} STYLO Suplementos
        </p>
      </div>
    </Reveal>
  );
}
