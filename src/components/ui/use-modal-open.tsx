"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const ModalActivity = createContext(false);

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;
let open = false;
const snapshot = () => open;
const serverSnapshot = () => false;

function subscribe(update: () => void) {
  listeners.add(update);
  if (!observer) {
    const sync = () => {
      // Inline desktop filter dialogs are not overlays and must not pause cards.
      const next = document.querySelector("dialog:modal") !== null;
      if (next === open) return;
      open = next;
      // Insertions during hydration do not affect modal state. Only monitor
      // removals while a modal is actually open, so an unmounted dialog also
      // releases the pause without inspecting every inserted product node.
      observer?.observe(document.body, {
        attributes: true,
        attributeFilter: ["open"],
        childList: next,
        subtree: true,
      });
      listeners.forEach((notify) => notify());
    };
    observer = new MutationObserver((records) => {
      if (
        records.some((record) =>
          record.type === "attributes"
            ? record.target instanceof HTMLDialogElement
            : open,
        )
      )
        sync();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["open"],
      subtree: true,
    });
    sync();
  }
  return () => {
    listeners.delete(update);
    if (!listeners.size) {
      observer?.disconnect();
      observer = null;
      open = false;
    }
  };
}

/** One React subscription and one observer for the entire public storefront. */
export function ModalActivityProvider({ children }: { children: ReactNode }) {
  const blocked = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return (
    <ModalActivity.Provider value={blocked}>{children}</ModalActivity.Provider>
  );
}

export function useModalOpen() {
  return useContext(ModalActivity);
}
