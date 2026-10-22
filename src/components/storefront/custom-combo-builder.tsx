"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useCart } from "@/components/commerce/cart-provider";
import { addCustomComboAndRedirect } from "@/modules/commerce/actions";
import { formatPrice } from "@/modules/catalog/model";
import { CATALOG_GOALS } from "@/modules/catalog/goals";
import type { ComboCategory, ComboOption } from "@/modules/catalog/combo-options";

type Slot = { category: string; variantId: string };
const empty = (): Slot[] => Array.from({ length: 3 }, () => ({ category: "", variantId: "" }));
const compactName = (name: string) => name.match(/["“]([^"”]+)["”]/)?.[1] ?? name;

function presetSlots(categories: ComboCategory[], slug: string): Slot[] {
  const goal = CATALOG_GOALS.find((item) => item.slug === slug);
  const next = empty();
  if (!goal) return next;
  for (let index = 0; index < Math.min(3, goal.categories.length); index++) {
    const category = categories.find((item) => item.slug === goal.categories[index]);
    const option = category?.options.find((item) => !next.some((slot) => slot.variantId === item.variantId));
    if (category && option) next[index] = { category: category.id, variantId: option.variantId };
  }
  return next;
}

export function CustomComboBuilder({ categories }: { categories: ComboCategory[] }) {
  const { addCustomCombo, busy, error } = useCart();
  const [goal, setGoal] = useState<string | null>(CATALOG_GOALS[0].slug);
  const [slots, setSlots] = useState<Slot[]>(() => presetSlots(categories, CATALOG_GOALS[0].slug));
  const [message, setMessage] = useState("");
  const activeGoal = CATALOG_GOALS.find((item) => item.slug === goal);
  const selected = useMemo(() => slots.flatMap((slot) => {
    const option = categories.find((category) => category.id === slot.category)
      ?.options.find((item) => item.variantId === slot.variantId);
    return option ? [option] : [];
  }), [categories, slots]);
  const selectedIds = selected.map((option) => option.variantId);
  const duplicate = new Set(selectedIds).size !== selectedIds.length;
  const ready = selected.length >= 2 && !duplicate && !busy;
  const cash = selected.reduce((sum, item) => sum + item.cashPrice, 0);
  const list = selected.reduce((sum, item) => sum + item.listPrice, 0);

  const chooseGoal = (slug: string) => {
    setGoal(slug);
    setSlots(presetSlots(categories, slug));
    setMessage("");
  };
  const update = (index: number, slot: Slot) => {
    setGoal(null);
    setMessage("");
    setSlots((current) => current.map((item, position) => position === index ? slot : item));
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready) return;
    const origin = event.currentTarget.querySelector("button[type=submit]")?.getBoundingClientRect();
    const added = await addCustomCombo(selectedIds, origin);
    if (added) setMessage("Agregamos el conjunto a tu bolsa.");
  };

  if (!categories.length) return null;
  return (
    <section id="tu-combo" className="custom-combo" aria-labelledby="custom-combo-title">
      <div className="custom-combo-inner">
        <p className="reference-eyebrow">COMBOS POR OBJETIVO</p>
        <h2 id="custom-combo-title" className="custom-combo-title">Tu objetivo, <span className="reference-text-gold">tu combo</span></h2>
        <div className="custom-combo-goals" role="group" aria-label="Empezar por objetivo">
          {CATALOG_GOALS.map((item) => <button type="button" key={item.slug} aria-pressed={goal === item.slug} onClick={() => chooseGoal(item.slug)}>{item.name}</button>)}
          <button type="button" aria-pressed={goal === null} onClick={() => { setGoal(null); setSlots(empty()); setMessage(""); }}>A mi gusto</button>
        </div>
        <form className="custom-combo-layout" data-custom={goal === null} action={addCustomComboAndRedirect} onSubmit={submit}>
          {activeGoal ? (
            <div className="custom-combo-visual">
              <img src={activeGoal.image} width={768} height={1024} loading="lazy" alt="" />
              <strong>{activeGoal.name}</strong>
            </div>
          ) : (
            <div className="custom-combo-slots">
              <p className="custom-combo-instructions">Elegí dos o tres presentaciones para armar tu combo.</p>
              {slots.map((slot, index) => {
                const category = categories.find((item) => item.id === slot.category);
                const option: ComboOption | undefined = category?.options.find((item) => item.variantId === slot.variantId);
                return (
                  <fieldset className="custom-combo-slot" key={index}>
                    <legend><span>{String(index + 1).padStart(2, "0")}</span> Presentación {index + 1}</legend>
                    <div className="custom-combo-fields">
                      <label>Categoría
                        <select value={slot.category} onChange={(event) => update(index, { category: event.target.value, variantId: "" })}>
                          <option value="">Elegí una categoría</option>
                          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </label>
                      <label>Producto y sabor
                        <select value={slot.variantId} disabled={!category} onChange={(event) => update(index, { ...slot, variantId: event.target.value })}>
                          <option value="">Elegí una presentación</option>
                          {category?.options.map((item) => <option key={item.variantId} value={item.variantId}>{item.productName} · {item.label}</option>)}
                        </select>
                      </label>
                    </div>
                    {option && <div className="custom-combo-choice">
                      {option.image ? <img src={option.image} srcSet={option.imageSrcSet} sizes="72px" width={72} height={72} alt="" loading="lazy" /> : <span className="custom-combo-image-empty" aria-hidden="true" />}
                      <div><strong>{option.productName}</strong><span>{option.label}</span></div><b>{formatPrice(option.cashPrice, 0)}</b>
                    </div>}
                  </fieldset>
                );
              })}
            </div>
          )}
          <aside className="custom-combo-summary">
            {activeGoal ? <p className="custom-combo-why">{activeGoal.description}</p> : <h3>Tu combo</h3>}
            <ul>{selected.map((item) => <li key={item.variantId}><span>{compactName(item.productName)} · {item.label}</span><b>{formatPrice(item.cashPrice, 0)}</b></li>)}</ul>
            {slots.filter((slot) => slot.variantId).map((slot) => <input key={slot.variantId} type="hidden" name="variantId" value={slot.variantId} />)}
            <div className="custom-combo-total"><span>Con transferencia</span><strong>{formatPrice(cash, 0)}</strong></div>
            <p className="custom-combo-other">Con Mercado Pago: {formatPrice(list, 0)}</p>
            <p className="custom-combo-note">Si hay una promoción vigente aplicable, la bolsa mostrará el precio final.</p>
            {duplicate && <p role="alert">Elegí presentaciones diferentes.</p>}
            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}
            <button type="submit" disabled={!ready}>Agregar combo a la bolsa</button>
            <noscript><p>Para armar un combo personalizado activá JavaScript. También podés <Link href="/catalogo">elegir productos en la tienda</Link>.</p></noscript>
          </aside>
        </form>
      </div>
    </section>
  );
}
