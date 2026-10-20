"use client";

import { useId, useState } from "react";
import { normalizeSearch } from "@/modules/catalog/search";

type VariantOption = { value: string; label: string };

export function SearchableVariantSelect({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name?: string;
  value: string;
  options: VariantOption[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const matches = options.filter((option) => {
    const text = normalizeSearch(option.label);
    return terms.every((term) => text.includes(term));
  });
  const selected = options.find((option) => option.value === value);
  const visible =
    selected && !matches.some((option) => option.value === value)
      ? [selected, ...matches]
      : matches;

  return (
    <div className="searchable-variant">
      <label htmlFor={`${id}-query`}>Buscar {label.toLowerCase()}</label>
      <input
        id={`${id}-query`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Producto, marca, sabor o SKU"
        autoComplete="off"
      />
      <label htmlFor={`${id}-select`}>{label}</label>
      <select
        id={`${id}-select`}
        name={name}
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
      >
        {!value && <option value="">Elegí una presentación</option>}
        {visible.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <small aria-live="polite">{matches.length} coincidencias</small>
    </div>
  );
}
