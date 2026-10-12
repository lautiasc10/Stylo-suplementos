import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

export function IconAction({
  label,
  icon,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: IconName;
}) {
  return (
    <button
      {...props}
      type="button"
      className={`icon-action ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
      <span className="action-tooltip" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
