import { beforeEach, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({ access: vi.fn(), from: vi.fn(), select: vi.fn(), gte: vi.fn(), lt: vi.fn(), eq: vi.fn(), ilike: vi.fn(), order: vi.fn(), range: vi.fn() }));
vi.mock("../../src/modules/admin/access", () => ({ requireAdmin: state.access }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { readSalesPage } from "../../src/modules/admin/sales-actions";

beforeEach(() => {
  vi.resetAllMocks();
  state.access.mockResolvedValue({ client: { from: state.from } });
  const chain = { select: state.select, gte: state.gte, lt: state.lt, eq: state.eq, ilike: state.ilike, order: state.order, range: state.range };
  state.from.mockReturnValue(chain);
  for (const method of [state.select, state.gte, state.lt, state.eq, state.ilike, state.order]) method.mockReturnValue(chain);
  state.range.mockResolvedValue({ data: [{ id: "a" }], count: 27, error: null });
});

test("autorización antes de leer el historial privado", async () => {
  state.access.mockRejectedValue(new Error("No autorizado"));
  await expect(readSalesPage({ period: "current", status: "all", search: "", page: 0 })).rejects.toThrow("No autorizado");
  expect(state.from).not.toHaveBeenCalled();
});

test("página de diez, búsqueda de cliente y orden descendente se resuelven en la base", async () => {
  const result = await readSalesPage({ period: "current", status: "paid", search: "Ana", page: 2 });
  expect(state.from).toHaveBeenCalledWith("commerce_orders");
  expect(state.select).toHaveBeenCalledWith(expect.stringContaining("snapshot"), { count: "exact" });
  expect(state.eq).toHaveBeenCalledWith("payment_status", "paid");
  expect(state.ilike).toHaveBeenCalledWith("customer_name", "%Ana%");
  expect(state.order).toHaveBeenCalledWith("operation_at", { ascending: false });
  expect(state.range).toHaveBeenCalledWith(20, 29);
  expect(result.total).toBe(27);
  expect(result.rows).toHaveLength(1);
});
