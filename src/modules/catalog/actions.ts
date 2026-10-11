"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/admin/access";
import { validateCatalog, type Catalog } from "./model";
import { inspectImage } from "./image";

export async function saveCatalog(
  catalog: Catalog,
): Promise<{ catalog?: Catalog; error?: string }> {
  const { client } = await requireAdmin();
  try {
    if (JSON.stringify(catalog).length > 2 * 1024 * 1024)
      return {
        error:
          "El catálogo supera 2 MB. Reducí textos o registros antes de guardar.",
      };
    const errors = validateCatalog(catalog);
    if (errors.length) return { error: errors.join(" ") };
    const { data: revision, error } = await client.rpc("save_catalog", {
      payload: catalog,
      expected_revision: catalog.revision,
    });
    if (error)
      return {
        error:
          error.code === "40001"
            ? "El catálogo cambió en otra sesión. Recargá la página antes de guardar."
            : "No pudimos guardar. Revisá SKU, URLs e imágenes; el lote completo quedó sin aplicar.",
      };
    revalidatePath("/", "layout");
    return { catalog: { ...catalog, revision } };
  } catch {
    return { error: "Los datos no tienen el formato esperado." };
  }
}

export async function uploadCatalogImage(
  form: FormData,
): Promise<{ path?: string; error?: string }> {
  const { client } = await requireAdmin();
  const file = form.get("file"),
    productId = String(form.get("productId") ?? "");
  if (
    !(file instanceof File) ||
    file.size > 5 * 1024 * 1024 ||
    file.size < 12 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      productId,
    )
  )
    return { error: "Elegí una imagen de hasta 5 MB." };
  let inspected;
  try {
    inspected = await inspectImage(file);
  } catch {
    return { error: "La imagen debe ser JPEG, PNG o WebP válido." };
  }
  const { bytes, mime, extension } = inspected;
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from("product-media")
    .upload(path, bytes, { contentType: mime, upsert: false });
  return error ? { error: "No pudimos subir la imagen." } : { path };
}
