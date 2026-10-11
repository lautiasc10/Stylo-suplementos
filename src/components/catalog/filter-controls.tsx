"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function FilterPanel({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 960px)");
    const update = () => {
      if (panel.current) panel.current.open = desktop.matches;
    };
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);

  // The complete GET form is initially open and usable without JavaScript.
  return (
    <details className="catalog-filter-panel" ref={panel} open>
      <summary className="catalog-panel-toggle">
        <span>Filtrar y ordenar</span>
        {activeCount > 0 && (
          <span className="catalog-filter-count">{activeCount}</span>
        )}
        <span className="catalog-filter-chevron" aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}

export function FilterOptions({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  const [selected, setSelected] = useState(value ?? options[0].value);
  const choice =
    options.find((option) => option.value === selected) ?? options[0];
  return (
    <details
      className="catalog-filter-group"
      open={Boolean(value && value !== options[0].value)}
    >
      <summary>
        <span>
          <span className="catalog-filter-label">{label}</span>
          <span className="catalog-filter-value">{choice.label}</span>
        </span>
        <span className="catalog-filter-chevron" aria-hidden="true" />
      </summary>
      <fieldset className="catalog-filter-options">
        <legend className="sr-only">{label}</legend>
        {options.map((option) => (
          <label className="catalog-filter-option" key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected === option.value}
              onChange={() => setSelected(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}
