import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type LinkProps = {
  href: string;
  children: ReactNode;
  prefetch?: boolean;
  onNavigate?: (event: { preventDefault: () => void }) => void;
};
const state = vi.hoisted(() => ({
  ready: true,
  pathname: "/admin/catalogo",
  links: new Map<string, LinkProps>(),
}));
vi.mock("next/link", () => ({
  default: (props: LinkProps) => {
    state.links.set(props.href, props);
    return createElement("a", { href: props.href }, props.children);
  },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams("seccion=brands"),
}));
vi.mock("@/components/admin/workspace-navigation", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useWorkspaceNavigation: () => ({ ready: state.ready }),
}));
vi.mock("@/modules/admin/actions", () => ({ signOut: vi.fn() }));
vi.mock("next/font/google", () => ({
  Barlow_Condensed: () => ({ variable: "admin-display" }),
  Manrope: () => ({ variable: "admin-body" }),
}));
import { AdminNavigation } from "../../src/components/admin/navigation";
import { AdminOverview } from "../../src/components/admin/overview";
import { demoCatalog } from "../../src/modules/catalog/demo";

beforeEach(() => {
  state.ready = true;
  state.links.clear();
});
afterEach(() => vi.unstubAllGlobals());

test("entrar en Resumen desde cualquier tarea usa el historial local sin esperar una página", () => {
  for (const pathname of [
    "/admin/catalogo",
    "/admin/promociones",
    "/admin/pedidos",
  ]) {
    state.pathname = pathname;
    const pushState = vi.fn(),
      scrollTo = vi.fn();
    vi.stubGlobal("window", {
      location: { href: `http://127.0.0.1:3000${pathname}?seccion=brands` },
      history: { pushState },
      scrollTo,
    });
    renderToStaticMarkup(createElement(AdminNavigation));
    const summary = state.links.get("/admin")!;
    const preventDefault = vi.fn();
    summary.onNavigate!({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(summary.prefetch).toBe(false);
    expect(pushState).toHaveBeenCalledOnce();
    expect(String(pushState.mock.calls[0][2])).toBe(
      "http://127.0.0.1:3000/admin",
    );
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  }
});

test("el enlace de reposición del Resumen abre el catálogo en el panel cargado", () => {
  renderToStaticMarkup(
    createElement(AdminOverview, { catalog: demoCatalog() }),
  );
  for (const href of ["/admin/catalogo"]) {
    const pushState = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "http://127.0.0.1:3000/admin" },
      history: { pushState },
      scrollTo: vi.fn(),
    });
    const preventDefault = vi.fn();
    state.links.get(href)!.onNavigate!({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(String(pushState.mock.calls[0][2])).toBe(
      `http://127.0.0.1:3000${href}`,
    );
  }
});

test("Resumen separa facturación, ganancia y retiros pendientes", () => {
  const html = renderToStaticMarkup(createElement(AdminOverview, {
    catalog: demoCatalog(),
    monthlySales: { month: "2026-10", pendingPickups: 3, history: [{ month: "2026-10", revenue: 2750000, sales: 2, profit: null, missing_costs: 1 }] },
  }));
  expect(html).toContain("Facturación mensual");
  expect(html).toContain("Ganancias");
  expect(html).toContain("Pendientes de retiro");
  expect(html).toContain("27.500");
  expect(html).toContain("1 venta sin costo comprobable");
  expect(html).not.toContain("Accesos rápidos");
  expect(html).not.toContain("Productos publicados");
});

test("antes de cargar el panel, Resumen conserva la navegación normal protegida", () => {
  state.ready = false;
  state.pathname = "/admin/catalogo";
  renderToStaticMarkup(createElement(AdminNavigation));
  const preventDefault = vi.fn();
  const summary = state.links.get("/admin")!;
  summary.onNavigate!({ preventDefault });
  expect(preventDefault).not.toHaveBeenCalled();
  expect(summary.href).toBe("/admin");
});
