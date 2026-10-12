import type { ReactNode } from "react";

export function AdminTable({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="manager-table-wrap admin-table-wrap">
      <table
        role="table"
        aria-label={label}
        className={`manager-table admin-data-table ${className}`}
      >
        {children}
      </table>
    </div>
  );
}
