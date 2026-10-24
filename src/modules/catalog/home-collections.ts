import type { Product } from "./model";

const arrivalTag = (tag: string) =>
  /^(nuevo|novedad|novedades)$/.test(tag.trim().toLocaleLowerCase("es-AR"));
export const isNewArrival = (product: Pick<Product, "tags">) =>
  product.tags.some(arrivalTag);

export function setNewArrivalTags(tags: string[], selected: boolean) {
  const other = tags.filter((tag) => !arrivalTag(tag));
  return selected ? [...other, "novedad"] : other;
}

/** Editorially marked products only; photo changes and array order are not dates. */
export function homeArrivals(products: Product[]) {
  return products
    .filter((product) => product.active && isNewArrival(product))
    .slice(0, 4);
}
