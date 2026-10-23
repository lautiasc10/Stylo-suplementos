import { beforeEach, expect, test, vi } from "vitest";
import { demoCatalog } from "../../src/modules/catalog/demo";
import { emptyPromotions } from "../../src/modules/commerce/promotions";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  catalog: vi.fn(),
  promotions: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
  monthlyOrder: vi.fn(),
  range: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../../src/modules/admin/access", () => ({
  requireAdmin: mocks.access,
}));
vi.mock("@/modules/catalog/server", () => ({ getCatalog: mocks.catalog }));
vi.mock("@/modules/commerce/promotions-server", () => ({
  readPromotions: mocks.promotions,
}));
import { readAdminWorkspace } from "../../src/modules/admin/workspace";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({ client: { from: mocks.from } });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockImplementation((columns: string) =>
    columns === "snapshot" ? { eq: mocks.eq } : { order: mocks.order },
  );
  mocks.order.mockReturnValue({ limit: mocks.limit });
  mocks.limit.mockResolvedValue({ data: [], error: null });
  mocks.eq.mockReturnValue({ gte: mocks.gte });
  mocks.gte.mockReturnValue({ lt: mocks.lt });
  mocks.lt.mockReturnValue({ order: mocks.monthlyOrder });
  mocks.monthlyOrder.mockReturnValue({
    order: mocks.monthlyOrder,
    range: mocks.range,
  });
  mocks.range.mockResolvedValue({ data: [], error: null });
  mocks.catalog.mockResolvedValue({ catalog: demoCatalog(), error: false });
  mocks.promotions.mockResolvedValue({ state: emptyPromotions, error: false });
});

test("rechazar el acceso impide iniciar cualquier lectura privada", async () => {
  mocks.access.mockRejectedValue(new Error("Acceso no autorizado"));
  await expect(readAdminWorkspace()).rejects.toThrow("Acceso no autorizado");
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.range).not.toHaveBeenCalled();
  expect(mocks.catalog).not.toHaveBeenCalled();
  expect(mocks.promotions).not.toHaveBeenCalled();
});

test("espera la autorización y después lee recursos independientes en paralelo con pedidos acotados", async () => {
  let authorize!: (value: unknown) => void;
  mocks.access.mockReturnValue(
    new Promise((resolve) => {
      authorize = resolve;
    }),
  );
  let finishCatalog!: (value: unknown) => void;
  mocks.catalog.mockReturnValue(
    new Promise((resolve) => {
      finishCatalog = resolve;
    }),
  );
  const result = readAdminWorkspace();
  await Promise.resolve();
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.range).not.toHaveBeenCalled();
  authorize({ client: { from: mocks.from } });
  await vi.waitFor(() => expect(mocks.limit).toHaveBeenCalledWith(50));
  expect(mocks.promotions).toHaveBeenCalledTimes(1);
  expect(mocks.from).toHaveBeenCalledWith("commerce_orders");
  expect(mocks.select).toHaveBeenCalledWith(
    "id,customer,snapshot,created_at,payment_status",
  );
  expect(mocks.order).toHaveBeenCalledWith("created_at", { ascending: false });
  expect(mocks.eq).toHaveBeenCalledWith("payment_status", "paid");
  expect(mocks.range).toHaveBeenCalledWith(0, 999);
  finishCatalog({ catalog: demoCatalog(), error: false });
  expect((await result).orders).toEqual([]);
});

test("las ventas del mes recorren todas las páginas sin limitarse a los últimos 50 pedidos", async () => {
  mocks.range
    .mockResolvedValueOnce({
      data: Array.from({ length: 1000 }, () => ({ snapshot: { total: 100 } })),
      error: null,
    })
    .mockResolvedValueOnce({
      data: [{ snapshot: { total: 250 } }],
      error: null,
    });
  const result = await readAdminWorkspace();
  expect(result.monthlySales).toEqual({ amount: 100250, count: 1001 });
  expect(mocks.range.mock.calls).toEqual([
    [0, 999],
    [1000, 1999],
  ]);
  expect(mocks.monthlyOrder).toHaveBeenCalledWith("created_at", {
    ascending: true,
  });
  expect(mocks.monthlyOrder).toHaveBeenCalledWith("id", { ascending: true });
  expect(mocks.gte).toHaveBeenCalledWith("created_at", expect.any(String));
  expect(mocks.lt).toHaveBeenCalledWith("created_at", expect.any(String));
  expect(mocks.limit).toHaveBeenCalledWith(50);
});

test("una consulta mensual fallida no se presenta como cero ventas ni oculta los pedidos", async () => {
  mocks.range.mockResolvedValue({
    data: null,
    error: { message: "unavailable" },
  });
  const result = await readAdminWorkspace();
  expect(result.monthlySales).toBeNull();
  expect(result.orders).toEqual([]);
});

test("un error parcial no presenta registros vacíos como si fueran datos válidos", async () => {
  mocks.limit.mockResolvedValue({
    data: null,
    error: { message: "unavailable" },
  });
  const result = await readAdminWorkspace();
  expect(result.orders).toBeNull();
  expect(result.catalog).toEqual(demoCatalog());
  expect(result.promotions).toEqual(emptyPromotions);
});
