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
  if (target.search) next.search = target.search;
  next.hash = "";
  if (section) next.searchParams.set("seccion", section);
  else next.searchParams.delete("seccion");
  if (next.href === window.location.href) return;
  window.history.pushState(null, "", next);
  if (previousPath !== href) window.scrollTo({ top: 0, behavior: "instant" });
}
