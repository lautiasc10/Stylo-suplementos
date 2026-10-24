import { buenosAiresMonthBounds } from "./monthly-sales";
import type { OrderRecord } from "@/modules/commerce/orders";

export type SalesPeriod = "current" | "previous" | "three" | "year" | "custom";
export type SalesStatus = "all" | "pending" | "paid";
export type SalesQuery = { period: SalesPeriod; status: SalesStatus; search: string; page: number; from?: string; to?: string };
export type SalesMonth = { month: string; sales: number; revenue: number; profit: number | null; missing_costs: number };
export type SalesSummary = { month: string; history: SalesMonth[]; pendingPickups: number };

export function salesPeriodBounds(period: SalesPeriod, now = new Date(), from?: string, to?: string) {
  const current = buenosAiresMonthBounds(now);
  const date = new Date(current.start);
  const monthStart = (offset: number) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1, 3)).toISOString();
  if (period === "current") return current;
  if (period === "previous") return { start: monthStart(-1), end: current.start };
  if (period === "three") return { start: monthStart(-2), end: current.end };
  if (period === "year") return { start: new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 3)).toISOString(), end: current.end };
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return null;
  const start = new Date(`${from}T03:00:00.000Z`);
  const end = new Date(`${to}T03:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start.toISOString().slice(0, 10) !== from || end.toISOString().slice(0, 10) !== to) return null;
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function salesQueryValid(query: SalesQuery) {
  return ["current", "previous", "three", "year", "custom"].includes(query.period)
    && ["all", "pending", "paid"].includes(query.status)
    && Number.isInteger(query.page) && query.page >= 0 && query.page <= 100000
    && typeof query.search === "string" && query.search.length <= 100
    && Boolean(salesPeriodBounds(query.period, new Date(), query.from, query.to));
}

export function monthLabel(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return month;
  const [year, numeric] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, numeric - 1, 1)));
}

export function previewSalesSummary(rows: OrderRecord[], now = new Date()): SalesSummary {
  const current = buenosAiresMonthBounds(now).start.slice(0, 7);
  const [year, month] = current.split("-").map(Number);
  const months: SalesMonth[] = Array.from({ length: 12 }, (_, index) => {
    const key = new Date(Date.UTC(year, month - 12 + index, 1)).toISOString().slice(0, 7);
    return { month: key, sales: 0, revenue: 0, profit: 0, missing_costs: 0 };
  });
  const monthOf = (value: string) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit" }).formatToParts(new Date(value));
    return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
  };
  for (const row of rows) {
    if (row.payment_status !== "paid") continue;
    const entry = months.find((item) => item.month === monthOf(row.paid_at ?? row.created_at));
    if (!entry) continue;
    entry.sales++;
    entry.revenue += row.snapshot.total - (row.refund_total ?? 0);
    if (row.cost_total === null || row.cost_total === undefined) { entry.missing_costs++; entry.profit = null; }
    else if (entry.profit !== null) entry.profit += row.snapshot.total - (row.refund_total ?? 0) - (row.fee_total ?? 0) - (row.expense_total ?? 0) - row.cost_total;
  }
  return { month: current, history: months, pendingPickups: rows.filter((row) => row.payment_status !== "paid").length };
}
