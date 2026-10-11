import type { Catalog } from "@/modules/catalog/model";
import type { CartLine, PaymentMethod } from "./cart";
export type Promotion = {
  id: string;
  name: string;
  kind: "sale" | "quantity" | "bundle";
  active: boolean;
  components: { variantId: string; quantity: number }[];
  listPrice: number;
  cashPrice: number;
  startsAt: string | null;
  endsAt: string | null;
};
export type Pricing = {
  base: number;
  discount: number;
  total: number;
  promotion: string | null;
  promotionId: string | null;
};
export const emptyPromotions = { revision: 0, promotions: [] as Promotion[] };
export type PromotionState = typeof emptyPromotions;
export function validatePromotions(
  input: unknown,
  catalog?: Catalog,
): string[] {
  if (!Array.isArray(input) || input.length > 100)
    return ["Se admiten hasta 100 promociones."];
  const errors: string[] = [],
    ids = new Set<string>();
  for (const p of input) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(p.id) ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 100 ||
      !["sale", "quantity", "bundle"].includes(p.kind) ||
      typeof p.active !== "boolean" ||
      !Number.isSafeInteger(p.listPrice) ||
      p.listPrice < 1 ||
      p.listPrice > 99999999999 ||
      !Number.isSafeInteger(p.cashPrice) ||
      p.cashPrice < 1 ||
      p.cashPrice > 99999999999 ||
      !Array.isArray(p.components) ||
      p.components.length < 1 ||
      p.components.length > 12
    ) {
      errors.push(
        "Revisá nombre, tipo, componentes y ambos precios de cada promoción.",
      );
      continue;
    }
    ids.add(p.id);
    const variants = new Set<string>();
    for (const c of p.components) {
      if (
        !c ||
        typeof c.variantId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(c.variantId) ||
        variants.has(c.variantId) ||
        !Number.isInteger(c.quantity) ||
        c.quantity < 1 ||
        c.quantity > 999 ||
        (catalog &&
          !catalog.products.some((product) =>
            product.variants.some((v) => v.id === c.variantId),
          ))
      )
        errors.push("Revisá las presentaciones y cantidades de la promoción.");
      variants.add(c?.variantId);
    }
    if (
      (p.kind !== "bundle" && p.components.length !== 1) ||
      (p.kind === "sale" && p.components[0]?.quantity !== 1) ||
      (p.kind === "quantity" && p.components[0]?.quantity < 2)
    )
      errors.push(
        "Una rebaja usa una presentación; cantidad requiere al menos dos unidades.",
      );
    for (const key of ["startsAt", "endsAt"] as const) {
      if (
        p[key] !== null &&
        (typeof p[key] !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T/.test(p[key]) ||
          !Number.isFinite(Date.parse(p[key])))
      )
        errors.push("La vigencia de la promoción no es válida.");
    }
    if (
      p.startsAt &&
      p.endsAt &&
      Date.parse(p.startsAt) >= Date.parse(p.endsAt)
    )
      errors.push("El fin debe ser posterior al inicio.");
  }
  return [...new Set(errors)];
}

export function priceLines(
  lines: CartLine[],
  promotions: Promotion[],
  method: PaymentMethod,
  now = Date.now(),
): Pricing {
  const field = method === "mercado-pago" ? "listPrice" : "cashPrice";
  const base = lines.reduce(
    (sum, line) => sum + line[field] * line.quantity,
    0,
  );
  let best: Pricing = {
    base,
    discount: 0,
    total: base,
    promotion: null,
    promotionId: null,
  };
  for (const p of [...promotions].sort((a, b) => a.id.localeCompare(b.id))) {
    if (
      !p.active ||
      (p.startsAt && now < Date.parse(p.startsAt)) ||
      (p.endsAt && now >= Date.parse(p.endsAt))
    )
      continue;
    const matched = p.components.map((c) => ({
      component: c,
      line: lines.find(
        (line) => line.variantId === c.variantId && line.available,
      ),
    }));
    if (
      matched.some(
        ({ component, line }) => !line || line.quantity < component.quantity,
      )
    )
      continue;
    let discount = 0;
    if (p.kind === "bundle") {
      const repeats = Math.min(
        ...matched.map(({ component, line }) =>
          Math.floor(line!.quantity / component.quantity),
        ),
      );
      const regular = matched.reduce(
        (sum, { component, line }) => sum + line![field] * component.quantity,
        0,
      );
      discount = (regular - p[field]) * repeats;
    } else {
      const line = matched[0].line!;
      discount = (line[field] - p[field]) * line.quantity;
    }
    if (
      Number.isSafeInteger(discount) &&
      discount > best.discount &&
      discount <= base
    )
      best = {
        base,
        discount,
        total: base - discount,
        promotion: p.name,
        promotionId: p.id,
      };
  }
  return best;
}
