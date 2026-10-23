"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/admin/access";
import { validateCatalog, type Catalog } from "./model";
import { prepareCatalogImage } from "./prepare-image";
import type { ImagePurpose, ImageUploadResult } from "./image-profile";
import { after } from "next/server";
import { restockMailConfig } from "@/modules/commerce/restock-mail";
import { dispatchRestockAlerts } from "@/modules/commerce/restock-dispatch";

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
    if (restockMailConfig()) {
      after(async () => {
        try {
          await dispatchRestockAlerts(client);
        } catch {
          // The catalog save succeeded; pending alerts remain in the private
          // queue for a retry on the next authenticated stock edit.
          console.error("No pudimos procesar los avisos de reposición.");
        }
      });
    }
    return { catalog: { ...catalog, revision } };
  } catch {
    return { error: "Los datos no tienen el formato esperado." };
  }
}

export async function processRestockAlerts(): Promise<{ message: string }> {
  const { client } = await requireAdmin();
  if (!restockMailConfig())
    return { message: "Los avisos por email todavía no están habilitados." };
  try {
    const { sent, failed } = await dispatchRestockAlerts(client);
    return {
      message: failed
        ? `Se enviaron ${sent} avisos; ${failed} quedaron pendientes para reintentar.`
        : `Se enviaron ${sent} avisos pendientes.`,
    };
  } catch {
    return { message: "No pudimos procesar los avisos pendientes." };
  }
}

export async function uploadCatalogImage(
  form: FormData,
): Promise<ImageUploadResult> {
  const { client } = await requireAdmin();
  const file = form.get("file"),
    productId = String(form.get("productId") ?? ""),
    purpose = String(form.get("purpose") ?? "product");
  if (
    !(file instanceof File) ||
    file.size > 5 * 1024 * 1024 ||
    file.size < 12 ||
    !["product", "information", "brand"].includes(purpose) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      productId,
    )
  )
    return { error: "Elegí una imagen de hasta 5 MB." };
  if (purpose !== "brand") {
    const capability = await client.rpc("catalog_media_capabilities");
    if (capability.error || capability.data?.normalizedUploads !== true)
      return {
        error:
          "La carga automática requiere activar la migración de imágenes en Supabase. La foto anterior se conserva.",
      };
  }
  let prepared;
  try {
    prepared = await prepareCatalogImage(
      file,
      productId,
      purpose as ImagePurpose,
    );
  } catch (error) {
    return {
      error:
        error instanceof Error &&
        /^(La foto|El fondo|No se detectó|El envase|La imagen|Elegí|Usá)/.test(
          error.message,
        )
          ? error.message
          : "No pudimos procesar la imagen. Usá JPEG, PNG o WebP estático de hasta 5 MB y 16 megapíxeles.",
    };
  }
  const bucket = client.storage.from("product-media");
  const uploaded: string[] = [];
  try {
    for (const item of prepared.files) {
      const result = await bucket.upload(item.path, item.bytes, {
        contentType: item.mime,
        upsert: false,
        cacheControl: "31536000",
      });
      if (result.error) throw new Error("upload");
      uploaded.push(item.path);
    }
    return { path: prepared.path, notice: prepared.notice };
  } catch {
    // Remove only objects created by this failed attempt; never older photos.
    if (uploaded.length) await bucket.remove(uploaded).catch(() => undefined);
    return {
      error:
        "No pudimos subir todas las copias. La imagen anterior se conserva; podés reintentar.",
    };
  }
}
