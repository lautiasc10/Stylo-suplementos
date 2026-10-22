import { AdminWorkspace } from "@/components/admin/workspace";
import "../../../admin-premium.css";

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminWorkspace preview>{children}</AdminWorkspace>;
}
