"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

function filterQuery(
  values: Iterable<[string, FormDataEntryValue | string | undefined]>,
) {
  const query = new URLSearchParams();
  for (const [name, value] of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text && !(name === "orden" && text === "name")) query.set(name, text);
  }
  query.sort();
  return query.toString();
}

export function AutomaticFilterForm({
  action,
  values,
  children,
}: {
  action: string;
  values: Record<string, string | undefined>;
  children: ReactNode;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQuery = useRef<string | null>(null);
  const requestedQuery = useRef<string | null>(null);
  const composing = useRef(false);
  const appliedQuery = filterQuery(Object.entries(values));

  function cancelTimer() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }
  function apply() {
    cancelTimer();
    if (!form.current || !form.current.checkValidity()) return;
    const query = filterQuery(new FormData(form.current).entries());
    const shouldNavigate =
      query !== appliedQuery ||
      (requestedQuery.current !== null && requestedQuery.current !== query);
    pendingQuery.current = shouldNavigate ? query : null;
    if (shouldNavigate) {
      requestedQuery.current = query;
      router.replace(`${action}${query ? `?${query}` : ""}`, { scroll: false });
    }
  }
  function schedule(immediate = false) {
    cancelTimer();
    if (composing.current || !form.current || !form.current.checkValidity())
      return;
    pendingQuery.current = filterQuery(new FormData(form.current).entries());
    if (immediate) apply();
    else timer.current = setTimeout(apply, 400);
  }

  useEffect(() => {
    // An earlier response must not overwrite a newer choice or unfinished typing.
    if (
      !form.current ||
      (pendingQuery.current !== null && pendingQuery.current !== appliedQuery)
    )
      return;
    const ownCommit = pendingQuery.current !== null;
    pendingQuery.current = null;
    requestedQuery.current = null;
    for (const element of Array.from(form.current.elements)) {
      if (!(element instanceof HTMLInputElement)) continue;
      const value = values[element.name] ?? "";
      if (element.type === "radio")
        element.checked =
          element.value === (value || (element.name === "orden" ? "name" : ""));
      else if (
        (!ownCommit || document.activeElement !== element) &&
        element.value !== value
      )
        element.value = value;
    }
    form.current.dispatchEvent(new Event("catalog-filter-sync"));
  }, [appliedQuery, values]);
  useEffect(() => {
    const cancelNavigation = () => {
      cancelTimer();
      pendingQuery.current = null;
      requestedQuery.current = null;
    };
    const handleLink = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]"))
        cancelNavigation();
    };
    document.addEventListener("click", handleLink, true);
    window.addEventListener("popstate", cancelNavigation);
    return () => {
      cancelTimer();
      document.removeEventListener("click", handleLink, true);
      window.removeEventListener("popstate", cancelNavigation);
    };
  }, []);

  return (
    <form
      ref={form}
      action={action}
      method="get"
      className="catalog-filters"
      onChange={(event) => {
        if (event.target instanceof HTMLInputElement)
          schedule(event.target.type === "radio");
      }}
      onCompositionStart={() => {
        composing.current = true;
        cancelTimer();
      }}
      onCompositionEnd={() => {
        composing.current = false;
        schedule();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      {children}
      {/* An implicit Enter submission works even with multiple text fields. */}
      <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
      <noscript>
        <button type="submit" className="catalog-filter-submit">
          Filtrar
        </button>
      </noscript>
    </form>
  );
}

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
  const fields = useRef<HTMLFieldSetElement>(null);
  const initiallyOpen = useRef(Boolean(value && value !== options[0].value));
  const [selected, setSelected] = useState(value ?? options[0].value);
  useEffect(() => {
    const form = fields.current?.form;
    const sync = () => {
      const checked =
        fields.current?.querySelector<HTMLInputElement>("input:checked");
      if (checked) setSelected(checked.value);
    };
    form?.addEventListener("catalog-filter-sync", sync);
    return () => form?.removeEventListener("catalog-filter-sync", sync);
  }, []);
  const choice =
    options.find((option) => option.value === selected) ?? options[0];
  return (
    <details className="catalog-filter-group" open={initiallyOpen.current}>
      <summary>
        <span>
          <span className="catalog-filter-label">{label}</span>
          <span className="catalog-filter-value">{choice.label}</span>
        </span>
        <span className="catalog-filter-chevron" aria-hidden="true" />
      </summary>
      <fieldset className="catalog-filter-options" ref={fields}>
        <legend className="sr-only">{label}</legend>
        {options.map((option) => (
          <label className="catalog-filter-option" key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={(value ?? options[0].value) === option.value}
              onChange={() => setSelected(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}
