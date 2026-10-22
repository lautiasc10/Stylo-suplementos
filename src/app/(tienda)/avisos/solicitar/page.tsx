import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/modules/catalog/server";
import { publicCatalog, variantLabel } from "@/modules/catalog/model";
import { restockMailConfig } from "@/modules/commerce/restock-mail";
import { RestockRequestForm } from "@/components/commerce/restock-request-form";

export const metadata: Metadata = {
  title: "Aviso de reposición",
  robots: { index: false, follow: false },
};

export default async function RequestRestockPage({
  searchParams,
}: {
  searchParams: Promise<{ variante?: string }>;
}) {
  const { variante } = await searchParams;
  const { catalog, error } = await getCatalog();
  if (error) throw new Error("No pudimos consultar el catálogo.");
  const product = publicCatalog(catalog).products.find((item) =>
    item.variants.some((variant) => variant.id === variante && variant.stock === 0),
  );
  const variant = product?.variants.find((item) => item.id === variante);
  if (!product || !variant) notFound();
  return (
    <section className="container interior-page restock-page">
      <p className="eyebrow">AVISO DE REPOSICIÓN</p>
      <h1>Avisame cuando vuelva.</h1>
      <p className="page-intro">
        {product.name} · {variantLabel(variant)}
      </p>
      <RestockRequestForm
        variantId={variant.id}
        available={Boolean(restockMailConfig())}
      />
      <Link className="text-link" href={`/producto/${product.slug}?variante=${variant.id}`}>
        ← Volver al producto
      </Link>
    </section>
  );
}
