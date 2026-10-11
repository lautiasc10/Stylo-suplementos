import { categories } from "./categories";
import type { Catalog, Product } from "./model";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Synthetic fixtures used only by the explicitly labelled local preview and tests.
export function demoCatalog(): Catalog {
  const groups = categories.map((item, index) => ({
    id: id(index + 1),
    name: item.name,
    slug: item.slug,
    detail: item.detail,
    active: true,
    sortOrder: index,
  }));
  const brands = [
    {
      id: id(20),
      name: "Marca de prueba A",
      slug: "marca-de-prueba-a",
      active: true,
      sortOrder: 0,
    },
    {
      id: id(21),
      name: "Marca de prueba B",
      slug: "marca-de-prueba-b",
      active: true,
      sortOrder: 1,
    },
  ];
  const names = [
    "Proteína de prueba",
    "Creatina de prueba",
    "Pre-entreno de prueba",
    "Shaker de prueba",
  ];
  const products: Product[] = names.map((name, index) => ({
    id: id(30 + index),
    name,
    slug: [
      "proteina-de-prueba",
      "creatina-de-prueba",
      "pre-entreno-de-prueba",
      "shaker-de-prueba",
    ][index],
    brandId: brands[index % 2].id,
    categoryIds: [groups[index === 3 ? 4 : index].id],
    description:
      "Datos ficticios para revisar la interfaz. No representa un producto disponible ni contiene información comercial validada.",
    active: true,
    featured: index < 2,
    tags: ["demostración", "prueba"],
    seoTitle: name,
    seoDescription: "Producto ficticio de la vista previa local.",
    version: 0,
    images: [],
    variants: [
      {
        id: id(50 + index * 2),
        sku: `DEMO-${index + 1}-A`,
        flavor: index === 0 ? "Chocolate" : "",
        size: index === 0 ? "1 kg" : index === 1 ? "300 g" : "",
        presentation: index === 3 ? "600 ml" : "Envase",
        listPrice: [4500000, 3200000, 2800000, 1200000][index],
        cashPrice: [4100000, 2900000, 2500000, 1000000][index],
        stock: index === 2 ? 0 : 8,
        active: true,
      },
      ...(index === 0
        ? [
            {
              id: id(51),
              sku: "DEMO-1-B",
              flavor: "Vainilla",
              size: "1 kg",
              presentation: "Envase",
              listPrice: 4700000,
              cashPrice: 4300000,
              stock: 0,
              active: true,
            },
          ]
        : []),
    ],
  }));
  return { revision: 0, brands, categories: groups, products };
}
