/** Cash sales are marked paid when created. Group them by Buenos Aires calendar month. */
export function buenosAiresMonthBounds(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 3)).toISOString(),
    end: new Date(Date.UTC(year, month, 1, 3)).toISOString(),
  };
}

export function paidSalesAmount(rows: { snapshot: unknown }[]) {
  return rows.reduce((amount, row) => {
    const total = Number((row.snapshot as { total?: unknown } | null)?.total);
    return amount + (Number.isFinite(total) && total >= 0 ? total : 0);
  }, 0);
}
