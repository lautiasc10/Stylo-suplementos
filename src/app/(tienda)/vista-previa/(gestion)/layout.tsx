import { AdminWorkspace } from "@/components/admin/workspace";

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminWorkspace preview>{children}</AdminWorkspace>;
}
