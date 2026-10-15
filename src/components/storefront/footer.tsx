import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { HomeLink } from "./home-link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <HomeLink>
            <BrandMark />
          </HomeLink>
          <p>Potenciá tu mejor versión.</p>
        </div>
        <nav aria-label="Navegación del pie">
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/nosotros">Sobre STYLO</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <p className="footer-location">
          Rosario, Argentina
          <br />© {new Date().getFullYear()} STYLO Suplementos
        </p>
      </div>
    </footer>
  );
}
