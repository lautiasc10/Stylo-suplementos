import type { Metadata } from "next";
import Link from "next/link";
import { categories } from "@/modules/catalog/categories";

export const metadata: Metadata = { title: "Catálogo" };
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const selection = categories.find(item => item.slug === categoria);
  return <section className="container interior-page"><p className="eyebrow">LA SELECCIÓN STYLO</p><h1>{selection?.name ?? "Nuestro catálogo"}</h1><p className="page-intro">Estamos preparando nuestra selección de suplementos y accesorios. Los productos estarán disponibles próximamente.</p><nav className="category-chips" aria-label="Categorías"><Link href="/catalogo" aria-current={!selection ? "page" : undefined}>Todas</Link>{categories.map(item => <Link key={item.slug} href={`/catalogo?categoria=${item.slug}`} aria-current={selection?.slug === item.slug ? "page" : undefined}>{item.name}</Link>)}</nav><div className="empty-state"><span className="eyebrow">PRÓXIMAMENTE</span><h2>Tu próxima elección<br />empieza acá.</h2><p>Estamos dando forma a la tienda STYLO.</p><Link href="/" className="button button-outline">Volver al inicio</Link></div></section>;
}
