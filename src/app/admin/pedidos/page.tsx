import Link from "next/link";
import { requireAdmin } from "@/modules/admin/access";
import { getCatalog } from "@/modules/catalog/server";
import { ManualOrders } from "@/components/commerce/manual-orders";
export default async function Page() {
  const { client } = await requireAdmin();
  const { catalog, error } = await getCatalog();
  const result = await client
    .from("commerce_orders")
    .select("id,customer,snapshot,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <section className="admin-dashboard">
      <Link className="text-link" href="/admin">
        ← Panel
      </Link>
      {error || result.error ? (
        <p role="alert">
          No pudimos cargar los pedidos. Verificá la migración de Fase 3.
        </p>
      ) : (
        <ManualOrders catalog={catalog} orders={result.data} />
      )}
    </section>
  );
}
