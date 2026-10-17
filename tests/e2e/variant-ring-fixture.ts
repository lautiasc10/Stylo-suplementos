import { type Page } from "@playwright/test";
import { demoCatalog } from "../../src/modules/catalog/demo";

export async function seed(
  page: Page,
  broken = false,
  single = false,
  count = 4,
) {
  const catalog = demoCatalog(),
    product = catalog.products[0];
  catalog.products = [product];
  const photos = await page.evaluate(() =>
    [
      "Banana",
      "Frutilla",
      "Vainilla",
      "Cookies",
      "Chocolate",
      "Limón",
      "Naranja",
      "Uva",
    ].map((name, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 500;
      const c = canvas.getContext("2d")!;
      c.fillStyle = "#fff";
      c.fillRect(140, 50, 220, 400);
      c.fillStyle = ["#d8b474", "#dd6677", "#ccc0a0", "#997755"][index];
      c.fillRect(140, 70, 220, 80);
      c.fillStyle = "#111";
      c.font = "24px sans-serif";
      c.fillText(name, 160, 230);
      return canvas.toDataURL("image/webp");
    }),
  );
  product.variants = [
    "Banana",
    "Frutilla",
    "Vainilla",
    "Cookies",
    "Chocolate",
    "Limón",
    "Naranja",
    "Uva",
  ]
    .slice(0, single ? 1 : count)
    .map((flavor, i) => ({
      ...product.variants[0],
      id: `00000000-0000-4000-8000-00000000006${i}`,
      sku: `SPINNER-${i}`,
      flavor,
      stock: i === 1 ? 0 : 8,
      listPrice: 4500000 + i * 100000,
      cashPrice: 4100000 + i * 100000,
    }));
  product.images = (
    single ? [product.variants[0], product.variants[0]] : product.variants
  ).map((v, i) => ({
    id: `00000000-0000-4000-8000-00000000007${i}`,
    variantId: v.id,
    position: i,
    path: `${product.id}/00000000-0000-4000-8000-00000000008${i}.webp`,
    alt: `Frente ${single ? i : v.flavor}`,
  }));
  product.turnImages = [
    {
      id: "00000000-0000-4000-8000-000000000090",
      path: `${product.id}/00000000-0000-4000-8000-000000000091.webp`,
      variantId: null,
      view: "back",
      position: 0,
      alt: "Dorso del envase",
    },
  ];
  product.informationImages = [
    {
      id: "00000000-0000-4000-8000-000000000092",
      path: `${product.id}/00000000-0000-4000-8000-000000000093.webp`,
      variantId: null,
      position: 0,
      alt: "Información nutricional",
    },
  ];
  const images = Object.fromEntries(
    [
      ...product.images,
      ...product.turnImages,
      ...product.informationImages,
    ].map((image, i) => [
      image.path,
      broken && i === 1
        ? "data:image/webp;base64,broken"
        : photos[i % photos.length],
    ]),
  );
  await page.addInitScript(
    (data) => {
      if (!localStorage.getItem("stylo.catalog-preview.v1"))
        localStorage.setItem("stylo.catalog-preview.v1", JSON.stringify(data));
    },
    { catalog, images },
  );
  return { product, photos };
}
export const detail = "/vista-previa/producto/proteina-de-prueba";
