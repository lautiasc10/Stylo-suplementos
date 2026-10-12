import { requireAdmin } from "@/modules/admin/access";
import { getCatalog } from "@/modules/catalog/server";
import { readPromotions } from "@/modules/commerce/promotions-server";
import { PromotionsManager } from "@/components/commerce/promotions-manager";
export default async function Page() {
  await requireAdmin();
  const { catalog, error } = await getCatalog();
  const promotions = await readPromotions();
  return (
    <section className="admin-dashboard">
      {error || promotions.error ? (
        <p role="alert">
          No pudimos cargar las promociones. Verificá la migración de Fase 3.
        </p>
      ) : (
        <PromotionsManager catalog={catalog} initial={promotions.state} />
      )}
    </section>
  );
}
