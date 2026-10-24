"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

const WorkspaceNavigation = createContext({
  ready: false,
  setReady: (_ready: boolean) => {},
});

export function AdminWorkspaceScope({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  return (
    <WorkspaceNavigation.Provider value={{ ready, setReady }}>
      {children}
    </WorkspaceNavigation.Provider>
  );
}

export function useWorkspaceNavigation() {
  return useContext(WorkspaceNavigation);
}

export function workspacePaths(preview = false) {
  return preview
    ? [
        "/vista-previa/gestion",
        "/vista-previa/promociones",
        "/vista-previa/pedidos",
        "/vista-previa/resumen",
      ]
    : ["/admin/catalogo", "/admin/promociones", "/admin/pedidos", "/admin"];
}

export function navigateWorkspace(href: string, section?: string) {
  const next = new URL(window.location.href);
  const previousPath = next.pathname;
  const target = new URL(href, next);
  next.pathname = target.pathname;
  // Keep unrelated context (for example a preview origin) while replacing
  // section-specific state when the sidebar changes tasks.
  for (const key of ["seccion", "producto", "variante", "nuevo"]) next.searchParams.delete(key);
  target.searchParams.forEach((value, key) => next.searchParams.set(key, value));
  next.hash = "";
  if (section) next.searchParams.set("seccion", section);
  else next.searchParams.delete("seccion");
  if (next.href === window.location.href) return;
  window.history.pushState(null, "", next);
  if (previousPath !== href) window.scrollTo({ top: 0, behavior: "instant" });
}
