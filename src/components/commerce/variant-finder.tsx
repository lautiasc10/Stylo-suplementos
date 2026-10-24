"use client";
import { useId, useState } from "react";
import { normalizeSearch } from "@/modules/catalog/search";
import { variantLabel, type Catalog } from "@/modules/catalog/model";

export function VariantFinder({ catalog, value, excluded, onSelect, index }: {
  catalog: Catalog; value: string; excluded: string[]; onSelect: (id: string) => void; index: number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const options = catalog.products.filter((product) => product.active).flatMap((product) => {
    const brand = catalog.brands.find((item) => item.id === product.brandId);
    return product.variants.filter((variant) => variant.active && !excluded.includes(variant.id)).map((variant) => ({
      variant, label: `${product.name} · ${variantLabel(variant)}`, brand: brand?.name ?? "", search: normalizeSearch(`${product.name} ${brand?.name ?? ""} ${variant.sku} ${variant.flavor} ${variant.size} ${variant.presentation}`),
    }));
  });
  const selected = options.find((item) => item.variant.id === value);
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  const matches = (terms.length ? options.filter((item) => terms.every((term) => item.search.includes(term))) : options).slice(0, 8);
  return <div className="admin-variant-search">
    <label htmlFor={`${listId}-input`}>Presentación {index + 1}</label>
    <input id={`${listId}-input`} type="search" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
      placeholder="Buscar nombre, marca, SKU o sabor" value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
      onFocus={() => setOpen(true)} onBlur={(event) => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((value) => Math.min(value + 1, matches.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
        if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); onSelect(matches[active].variant.id); setQuery(""); setOpen(false); }
      }} />
    {selected && <p className={selected.variant.stock === 0 ? "admin-stock-warning" : ""}>Elegido: {selected.label} · {selected.variant.sku} · {selected.variant.stock === 0 ? "Sin stock" : `${selected.variant.stock} disponibles`}</p>}
    {open && <ul id={listId} className="admin-variant-search-results" role="listbox" aria-label={`Resultados para presentación ${index + 1}`}>
      {matches.length ? matches.map((item, optionIndex) => <li key={item.variant.id} role="presentation">
        <button id={`${listId}-${optionIndex}`} role="option" aria-selected={optionIndex === active} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(item.variant.id); setQuery(""); setOpen(false); }}><strong>{item.label}</strong><small>{item.brand} · {item.variant.sku} · {item.variant.stock === 0 ? "Sin stock" : `${item.variant.stock} disponibles`}</small></button>
      </li>) : <li>No encontramos esa presentación.</li>}
    </ul>}
  </div>;
}
