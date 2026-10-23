"use server";

import { headers } from "next/headers";
import { getEnvironment } from "@/lib/config/server";
import { prepareCatalogImage } from "./prepare-image";
import type { ImagePurpose } from "./image-profile";

/** Same processor as admin, restricted to local previews; no Storage or DB writes. */
export async function preparePreviewImage(form: FormData) {
  const environment = getEnvironment();
  const host = (await headers()).get("host") ?? "";
  if (
    environment.environment !== "local" ||
    !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(environment.siteUrl.hostname)
  )
    return {
      error:
        "La preparación de prueba solo está disponible en la vista previa local.",
    };
  const file = form.get("file"),
    id = String(form.get("productId") ?? "");
  const purpose = String(form.get("purpose") ?? "product");
  if (
    !(file instanceof File) ||
    !/^[0-9a-f-]{36}$/.test(id) ||
    !["product", "information", "brand"].includes(purpose)
  )
    return { error: "Elegí una imagen y un destino válido." };
  try {
    const result = await prepareCatalogImage(file, id, purpose as ImagePurpose);
    return {
      path: result.path,
      notice: result.notice,
      files: Object.fromEntries(
        result.files.map((item) => [
          item.path,
          `data:${item.mime};base64,${item.bytes.toString("base64")}`,
        ]),
      ),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error &&
        /^(La foto|El fondo|No se detectó|El envase|La imagen|Elegí|Usá)/.test(
          error.message,
        )
          ? error.message
          : "No pudimos procesar la imagen. Usá un archivo estático de hasta 5 MB y 16 megapíxeles.",
    };
  }
}
