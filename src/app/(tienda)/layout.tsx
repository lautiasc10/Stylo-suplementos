import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { getCatalog } from "@/modules/catalog/server";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { catalog, configured, error } = await getCatalog();
  const visible =
    configured && !error
      ? catalog.categories
          .filter((item) => item.active)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : undefined;
  return (
    <>
      <Header catalogCategories={visible} />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  );
}
