// Read-only public catalog snapshot. Output stays outside the repository.
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
);
const { data, error } = await client.rpc("catalog_snapshot");
if (error || !data?.products)
  throw new Error("No se pudo leer el catálogo público.");
const dir = process.argv[2];
if (!dir) throw new Error("Indicá una carpeta temporal.");
await mkdir(dir, { recursive: true });
await writeFile(
  `${dir}/catalog.json`,
  JSON.stringify(
    {
      catalog: data,
      imageBase: `${process.env.SUPABASE_URL}/storage/v1/object/public/product-media`,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    data.products.map((p) => ({
      slug: p.slug,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        flavor: v.flavor,
      })),
      images: p.images,
      turnImages: p.turnImages,
      info: p.informationImages,
    })),
    null,
    2,
  ),
);
