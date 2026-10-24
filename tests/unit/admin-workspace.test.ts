import { beforeEach, expect, test, vi } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { emptyPromotions } from "../../src/modules/commerce/promotions";

const mocks = vi.hoisted(() => ({ access: vi.fn(), catalog: vi.fn(), promotions: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../../src/modules/admin/access", () => ({ requireAdmin: mocks.access }));
vi.mock("@/modules/catalog/server", () => ({ getCatalog: mocks.catalog }));
vi.mock("@/modules/commerce/promotions-server", () => ({ readPromotions: mocks.promotions }));
import { readAdminWorkspace } from "../../src/modules/admin/workspace";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({ client: { rpc: mocks.rpc, from: mocks.from } });
  mocks.rpc.mockResolvedValue({ data: { month: "2026-10", pendingPickups: 1, history: [{ month: "2026-10", sales: 2, revenue: 100000, profit: null, missing_costs: 2 }] }, error: null });
  mocks.catalog.mockResolvedValue({ catalog: demoCatalog(), error: false });
  mocks.promotions.mockResolvedValue({ state: emptyPromotions, error: false });
});

test("rechazar acceso impide iniciar lecturas privadas", async () => {
  mocks.access.mockRejectedValue(new Error("Acceso no autorizado"));
  await expect(readAdminWorkspace()).rejects.toThrow("Acceso no autorizado");
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.catalog).not.toHaveBeenCalled();
});

test("resumen usa el agregado de base y no carga todo el historial en el navegador", async () => {
  const result = await readAdminWorkspace();
  expect(mocks.rpc).toHaveBeenCalledOnce();
  expect(mocks.rpc).toHaveBeenCalledWith("admin_sales_summary");
  expect(mocks.from).not.toHaveBeenCalled();
  expect(result.orders).toEqual([]);
  expect(result.monthlySales?.history.at(-1)).toMatchObject({ sales: 2, revenue: 100000, missing_costs: 2 });
});

test("un agregado fallido no se presenta como cero ventas", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
  const result = await readAdminWorkspace();
  expect(result.monthlySales).toBeNull();
  expect(result.catalog).toEqual(demoCatalog());
});
