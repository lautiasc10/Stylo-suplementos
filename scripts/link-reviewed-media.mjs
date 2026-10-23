// Register derivatives for the exact paths produced by the administrative upload.
import { readFile, writeFile } from "node:fs/promises";
const work = process.argv[2],
  finalDir = process.argv[3];
const initial = JSON.parse(
  await readFile(`${work}/catalog.json`, "utf8"),
).catalog;
const final = JSON.parse(
  await readFile(`${finalDir}/catalog.json`, "utf8"),
).catalog;
const updated = JSON.parse(
  await readFile("src/modules/catalog/updated-images.json", "utf8"),
);
const regular = JSON.parse(
  await readFile(`${work}/normalized/report.json`, "utf8"),
).records;
const missing = JSON.parse(
  await readFile(`${work}/missing-normalized/report.json`, "utf8"),
).records;
const fixedBack = JSON.parse(
  await readFile(`${work}/fix-back/report.json`, "utf8"),
).records[0];
const uploaded = [];
for (const product of final.products) {
  const before = initial.products.find((p) => p.id === product.id);
  const commercial = (p) => {
    const { images, turnImages, informationImages, version, ...data } = p;
    return data;
  };
  if (
    JSON.stringify(commercial(before)) !== JSON.stringify(commercial(product))
  )
    throw new Error(`Datos comerciales modificados: ${product.slug}`);
  for (const kind of ["images", "turnImages", "informationImages"])
    for (const image of product[kind] ?? []) {
      if ((before[kind] ?? []).some((old) => old.path === image.path)) continue;
      const sku = product.variants.find((v) => v.id === image.variantId)?.sku;
      let master;
      if (sku === "STAR-0014")
        master =
          "/media/products-normalized-v1/8f05b69b-6646-458a-b011-8ad86c4eccb0-ee6526134d56-v1-1000.webp";
      else if (sku === "STAR-0017")
        master = `/media/catalog-normalized-v2/${regular.find((r) => r.sku === "STAR-0014").outputs[1000].filename}`;
      else if (kind === "images" || kind === "turnImages") {
        const record =
          kind === "turnImages" && product.slug.includes("fix-bcaa")
            ? fixedBack
            : missing.find((r) => r.sku === sku);
        if (!record)
          throw new Error(`Falta derivado: ${product.slug} ${sku} ${kind}`);
        master = `/media/catalog-normalized-v2/${record.outputs[1000].filename}`;
      }
      if (master) updated[image.path] = master;
      uploaded.push({
        sku,
        slug: product.slug,
        kind,
        path: image.path,
        master,
      });
    }
}
await writeFile(
  "src/modules/catalog/updated-images.json",
  JSON.stringify(updated, null, 2) + "\n",
);
await writeFile(
  `${work}/uploaded.json`,
  JSON.stringify(uploaded, null, 2) + "\n",
);
console.log(
  JSON.stringify({ uploaded, commercialDataUnchanged: true }, null, 2),
);
