"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export function AdminDrawer({ title, children, onClose, busy = false, wide = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    node.querySelector<HTMLInputElement>('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])')?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return <dialog ref={dialog} className="admin-drawer" data-wide={wide} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget || busy) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <header className="admin-drawer-heading"><h2 id={titleId}>{title}</h2><button type="button" aria-label="Cerrar editor" disabled={busy} onClick={onClose}><Icon name="close" /></button></header>
    <div className="admin-drawer-body">{children}</div>
  </dialog>;
}
