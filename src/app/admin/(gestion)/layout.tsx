import { AdminWorkspace } from "@/components/admin/workspace";
import { readAdminWorkspace } from "@/modules/admin/workspace";
import { getEnvironment } from "@/lib/config/server";

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = await readAdminWorkspace();
  const imageBase = `${getEnvironment().supabase!.url}/storage/v1/object/public/product-media`;
  return (
    <AdminWorkspace initial={initial} imageBase={imageBase}>
      {children}
    </AdminWorkspace>
  );
}
