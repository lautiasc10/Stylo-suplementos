const formatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  numberingSystem: "latn",
});

/** Explicit separators avoid ICU spacing differences during hydration. */
export function orderDate(timestamp: string): { date: string; time: string } {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return { date: "—", time: "—" };
  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return {
    date: `${part("day")}/${part("month")}/${part("year")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}
