import { expect, test } from "vitest";
import { orderDate } from "../../src/modules/admin/order-date";

test("los pedidos se leen en Buenos Aires con separadores estables para SSR", () => {
  expect(orderDate("2026-10-23T00:00:36Z")).toEqual({
    date: "22/10/2026", time: "21:00",
  });
});

test("la fecha respeta el día y año locales al cruzar medianoche UTC", () => {
  expect(orderDate("2027-01-01T02:59:00Z")).toEqual({
    date: "31/12/2026", time: "23:59",
  });
  expect(orderDate("2027-01-01T03:00:00Z")).toEqual({
    date: "01/01/2027", time: "00:00",
  });
});

test("una fecha inválida no rompe la tabla ni inventa una fecha", () => {
  expect(orderDate("invalid")).toEqual({ date: "—", time: "—" });
});
