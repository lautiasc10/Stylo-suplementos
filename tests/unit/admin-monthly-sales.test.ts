import { expect, test } from "vitest";
import { buenosAiresMonthBounds, paidSalesAmount } from "../../src/modules/admin/monthly-sales";

test("el mes cambia a medianoche en Buenos Aires, no a medianoche UTC", () => {
  expect(buenosAiresMonthBounds(new Date("2026-11-01T02:59:59Z"))).toEqual({
    start: "2026-10-01T03:00:00.000Z",
    end: "2026-11-01T03:00:00.000Z",
  });
  expect(buenosAiresMonthBounds(new Date("2026-11-01T03:00:00Z")).start).toBe("2026-11-01T03:00:00.000Z");
});

test("el importe suma las instantáneas cobradas sin aceptar totales inválidos", () => {
  expect(paidSalesAmount([{ snapshot: { total: 12500 } }, { snapshot: { total: 15000 } }, { snapshot: null }])).toBe(27500);
});
