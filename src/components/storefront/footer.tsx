import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return <footer className="site-footer"><div className="container footer-inner">
    <div><Link href="/" aria-label="STYLO Suplementos, inicio"><Image src="/branding/logo-principal.webp" width={76} height={76} alt="" /></Link><p>Potenciá tu mejor versión.</p></div>
    <nav aria-label="Navegación del pie"><Link href="/catalogo">Catálogo</Link><Link href="/nosotros">Sobre STYLO</Link><Link href="/contacto">Contacto</Link></nav>
    <p className="footer-location">Rosario, Argentina<br />© {new Date().getFullYear()} STYLO Suplementos</p>
  </div></footer>;
}
