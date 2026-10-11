import Link from "next/link";
import { requireAdmin } from "@/modules/admin/access";
import { getCatalog } from "@/modules/catalog/server";
import { getEnvironment } from "@/lib/config/server";
import { CatalogManagement } from "@/components/catalog/management";
export default async function AdminCatalogPage() {
  await requireAdmin();
  const { catalog, error } = await getCatalog();
  const config = getEnvironment().supabase!;
  return (
    <section className="admin-dashboard">
      <Link className="text-link" href="/admin">
        ← Panel
      </Link>
      <p className="eyebrow">CATÁLOGO STYLO</p>
      <h1>Productos, marcas y categorías</h1>
      {error ? (
        <p role="alert">
          No pudimos consultar el catálogo. Verificá la migración de Fase 2
          antes de continuar.
        </p>
      ) : (
        <CatalogManagement
          initial={catalog}
          imageBase={`${config.url}/storage/v1/object/public/product-media`}
        />
      )}
    </section>
  );
}
