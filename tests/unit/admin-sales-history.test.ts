import { expect, test } from "vitest";
import { previewSalesSummary, salesPeriodBounds, salesQueryValid } from "../../src/modules/admin/sales-history";
import type { OrderRecord } from "../../src/modules/commerce/orders";

test("los períodos respetan el cambio de mes en Buenos Aires", () => {
  expect(salesPeriodBounds("current", new Date("2026-11-01T02:59:00Z"))).toEqual({ start: "2026-10-01T03:00:00.000Z", end: "2026-11-01T03:00:00.000Z" });
  expect(salesPeriodBounds("current", new Date("2026-11-01T03:01:00Z"))).toEqual({ start: "2026-11-01T03:00:00.000Z", end: "2026-12-01T03:00:00.000Z" });
  expect(salesPeriodBounds("previous", new Date("2026-11-01T03:01:00Z"))?.start).toBe("2026-10-01T03:00:00.000Z");
  expect(salesPeriodBounds("three", new Date("2026-11-01T03:01:00Z"))?.start).toBe("2026-09-01T03:00:00.000Z");
  expect(salesPeriodBounds("custom", new Date(), "2026-10-01", "2026-10-03")).toEqual({ start: "2026-10-01T03:00:00.000Z", end: "2026-10-04T03:00:00.000Z" });
  expect(salesPeriodBounds("custom", new Date(), "2026-02-30", "2026-03-01")).toBeNull();
});

test("el resumen de prueba separa pendientes, ventas cobradas y meses anteriores sin borrar datos", () => {
  const rows: OrderRecord[] = [
    { id: "a", customer: { name: "A" }, created_at: "2026-10-31T23:00:00Z", paid_at: "2026-11-01T03:02:00Z", payment_status: "paid", cost_total: 12000, snapshot: { total: 30000 } },
    { id: "b", customer: { name: "B" }, created_at: "2026-10-31T23:00:00Z", payment_status: "pending", snapshot: { total: 10000 } },
    { id: "c", customer: { name: "C" }, created_at: "2026-10-02T03:00:00Z", payment_status: "paid", snapshot: { total: 20000 } },
  ];
  const summary = previewSalesSummary(rows, new Date("2026-11-02T12:00:00Z"));
  expect(summary.month).toBe("2026-11");
  expect(summary.pendingPickups).toBe(1);
  expect(summary.history.at(-1)).toMatchObject({ sales: 1, revenue: 30000, profit: 18000 });
  expect(summary.history.at(-2)).toMatchObject({ sales: 1, revenue: 20000 });
});

test("rechaza páginas excesivas y rangos inválidos", () => {
  expect(salesQueryValid({ period: "current", status: "all", search: "", page: 0 })).toBe(true);
  expect(salesQueryValid({ period: "current", status: "all", search: "", page: 100001 })).toBe(false);
  expect(salesQueryValid({ period: "custom", status: "all", search: "", page: 0, from: "2026-10-20", to: "2026-10-01" })).toBe(false);
});
