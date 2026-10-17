"use client";

import { useEffect, useState } from "react";
import { variantLabel, type Variant } from "@/modules/catalog/model";

/** Real links preserve variant selection before hydration and without JavaScript. */
export function VariantPicker({
  variants,
  selected,
  href,
  onSelect,
}: {
  variants: Variant[];
  selected: Variant;
  href: (id: string) => string;
  onSelect: (id: string) => void;
}) {
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  const distinctFlavors =
    new Set(variants.map((item) => item.flavor)).size === variants.length;
  return (
    <fieldset className="variant-picker" data-selected-variant={selected.id}>
      <legend>Elegí tu presentación</legend>
      <div className="variant-options">
        {variants.map((item) => (
          <a
            key={item.id}
            href={href(item.id)}
            className="variant-chip"
            aria-current={item.id === selected.id ? "true" : undefined}
            aria-label={`${variantLabel(item)}${item.stock === 0 ? " · Sin stock" : ""}`}
            data-unavailable={item.stock === 0}
            onClick={(event) => {
              if (
                !enhanced ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              onSelect(item.id);
            }}
          >
            <span>
              {distinctFlavors && item.flavor
                ? item.flavor
                : variantLabel(item)}
            </span>
            {item.stock === 0 && item.id !== selected.id && (
              <small>Sin stock</small>
            )}
          </a>
        ))}
      </div>
      <p
        className="variant-availability"
        role="status"
        data-stock={selected.stock > 0 ? "available" : "empty"}
      >
        <span className={selected.stock === 0 ? "sr-only" : undefined}>
          {selected.stock > 0 ? "Disponible" : "Sin stock"}
        </span>
        {distinctFlavors &&
          selected.flavor &&
          [selected.size, selected.presentation].filter(Boolean).length > 0 &&
          `${selected.stock > 0 ? " · " : ""}${[selected.size, selected.presentation].filter(Boolean).join(" · ")}`}
      </p>
    </fieldset>
  );
}
