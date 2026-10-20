"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/modules/catalog/model";

export function CatalogPriceRange({
  value,
  ceiling,
}: {
  value?: string;
  ceiling: number;
}) {
  const [limit, setLimit] = useState(value ?? "");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => setLimit(value ?? ""), [value]);
  return (
    <fieldset className="catalog-price-range">
      <legend>Precio máximo</legend>
      <input type="hidden" name="max" value={limit} disabled={!ready} />
      <input
        type="range"
        disabled={!ready}
        min={0}
        max={ceiling}
        step={100}
        aria-label="Precio máximo (ARS)"
        aria-valuetext={
          limit ? formatPrice(Number(limit) * 100, 0) : "Sin límite"
        }
        value={limit ? Math.min(ceiling, Number(limit)) : ceiling}
        onChange={(event) =>
          setLimit(
            Number(event.target.value) === ceiling ? "" : event.target.value,
          )
        }
      />
      <div>
        <span>{formatPrice(0, 0)}</span>
        <output>
          {limit ? formatPrice(Number(limit) * 100, 0) : "Sin límite"}
        </output>
      </div>
      <noscript>
        <label className="catalog-min-price">
          Hasta (ARS)
          <input
            name="max"
            inputMode="decimal"
            defaultValue={value}
            placeholder="Sin máximo"
            pattern="[0-9]+([.,][0-9]{1,2})?"
          />
        </label>
      </noscript>
    </fieldset>
  );
}
