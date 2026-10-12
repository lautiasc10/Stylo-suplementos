"use client";
import { useRef } from "react";
import { Icon } from "./icon";

export function ConfirmAction({
  label,
  question,
  busy,
  onConfirm,
  focusAfterId,
}: {
  label: string;
  question: string;
  busy: boolean;
  onConfirm: () => Promise<boolean>;
  focusAfterId?: string;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  function cancel() {
    if (details.current) details.current.open = false;
    details.current?.querySelector("summary")?.focus();
  }
  return (
    <details ref={details} className="confirm-action">
      <summary className="icon-action" aria-label={label} title={label}>
        <Icon name="trash" />
        <span className="action-tooltip" aria-hidden="true">
          {label}
        </span>
      </summary>
      <div>
        <p>{question}</p>
        <button
          type="button"
          className="button button-destructive"
          disabled={busy}
          onClick={async () => {
            if (await onConfirm())
              requestAnimationFrame(() => {
                if (details.current?.isConnected) cancel();
                else if (focusAfterId)
                  document.getElementById(focusAfterId)?.focus();
              });
          }}
        >
          Confirmar eliminación
        </button>
        <button
          type="button"
          className="text-link"
          disabled={busy}
          onClick={cancel}
        >
          Cancelar
        </button>
      </div>
    </details>
  );
}
