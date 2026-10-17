"use client";

import { IconAction } from "@/components/admin/icon-action";
import { Icon } from "@/components/ui/icon";
import { type ProductImage, type Variant } from "@/modules/catalog/model";

export function ProductImagesEditor({
  images,
  variants,
  variantId,
  title,
  uploadLabel,
  busy,
  imageBase,
  imageUrls,
  onUpload,
  onReplace,
  onChange,
  purpose = "product",
  showAll = false,
}: {
  images: ProductImage[];
  variants: Variant[];
  variantId: string | null;
  title: string;
  uploadLabel: string;
  busy: boolean;
  imageBase: string;
  imageUrls: Record<string, string>;
  onUpload: (files: FileList | null, variantId: string | null) => void;
  onReplace: (imageId: string, file?: File) => void;
  onChange: (images: ProductImage[]) => void;
  purpose?: "product" | "information" | "turn";
  showAll?: boolean;
}) {
  const scoped = images
    .filter((image) => showAll || image.variantId === variantId)
    .sort((a, b) => a.position - b.position);
  const uploadId = `${purpose === "information" ? "information" : purpose === "turn" ? "turn" : "photos"}-${variantId ?? "shared"}`;
  const itemName = purpose === "information" ? "ficha informativa" : "imagen";
  function patch(imageId: string, changes: Partial<ProductImage>) {
    onChange(
      images.map((image) =>
        image.id === imageId ? { ...image, ...changes } : image,
      ),
    );
    if (changes.variantId !== undefined)
      requestAnimationFrame(() =>
        document.getElementById(`image-association-${imageId}`)?.focus(),
      );
  }
  function chooseCover(image: ProductImage) {
    const ordered = [...images].sort((a, b) => a.position - b.position);
    const firstIndex = ordered.findIndex((item) => item.id === scoped[0].id);
    ordered.splice(
      ordered.findIndex((item) => item.id === image.id),
      1,
    );
    ordered.splice(firstIndex, 0, image);
    onChange(ordered.map((item, position) => ({ ...item, position })));
  }
  return (
    <section className="variant-photos editor-wide" aria-label={title}>
      <div className="variant-photos-heading">
        <h4>{title}</h4>
        <button
          type="button"
          className="button button-outline"
          aria-label={`${purpose === "information" ? "Agregar fichas" : "Agregar fotos"} · ${title}`}
          id={`${uploadId}-button`}
          disabled={busy || images.length >= (purpose === "turn" ? 24 : 12)}
          onClick={() => document.getElementById(uploadId)?.click()}
        >
          <Icon name="plus" />{" "}
          {purpose === "information" ? "Agregar fichas" : "Agregar fotos"}
        </button>
        <input
          hidden
          id={uploadId}
          type="file"
          multiple
          aria-label={uploadLabel}
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || images.length >= (purpose === "turn" ? 24 : 12)}
          onChange={(event) => {
            onUpload(event.target.files, variantId);
            event.target.value = "";
          }}
        />
      </div>
      {!scoped.length && (
        <p className="variant-photos-empty">
          {purpose === "information"
            ? "Todavía no hay fichas informativas."
            : variantId
              ? "Sin fotos específicas de esta variante."
              : "Sin fotos compartidas."}
        </p>
      )}
      {scoped.map((image, localIndex) => {
        const number = images.findIndex((item) => item.id === image.id) + 1;
        return (
          <div className="image-editor" key={image.id}>
            {(imageBase || imageUrls[image.path]) && (
              <img
                src={imageUrls[image.path] || `${imageBase}/${image.path}`}
                alt=""
                width={96}
                height={96}
              />
            )}
            <label>
              Descripción de {itemName} {number}
              <input
                required
                maxLength={200}
                value={image.alt}
                disabled={busy}
                onChange={(event) =>
                  patch(image.id, { alt: event.target.value })
                }
              />
            </label>
            <label>
              Imagen de
              <select
                id={`image-association-${image.id}`}
                aria-label="Imagen de"
                value={image.variantId ?? ""}
                disabled={busy}
                onChange={(event) =>
                  patch(image.id, { variantId: event.target.value || null })
                }
              >
                <option value="">Todo el producto</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.sku || variant.flavor || "Nueva variante"}
                  </option>
                ))}
              </select>
            </label>
            {purpose === "turn" && (
              <label>
                Vista del envase
                <select
                  aria-label={`Vista de imagen ${number}`}
                  value={image.view ?? "back"}
                  disabled={busy}
                  onChange={(event) =>
                    patch(image.id, {
                      view: event.target.value as ProductImage["view"],
                    })
                  }
                >
                  <option value="left">Costado izquierdo</option>
                  <option value="back">Dorso</option>
                  <option value="right">Costado derecho</option>
                </select>
              </label>
            )}
            <div className="image-editor-actions">
              <IconAction
                icon="edit"
                label={`Cambiar ${itemName} ${number}`}
                disabled={busy}
                onClick={() =>
                  document.getElementById(`replace-image-${image.id}`)?.click()
                }
              />
              <input
                hidden
                id={`replace-image-${image.id}`}
                type="file"
                aria-label={`Archivo de reemplazo de ${itemName} ${number}`}
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(event) => {
                  onReplace(image.id, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <IconAction
                icon="back"
                label="Usar primero"
                disabled={busy || localIndex === 0}
                onClick={() => chooseCover(image)}
              />
              <IconAction
                icon="trash"
                label={
                  purpose === "information"
                    ? "Quitar ficha informativa"
                    : "Quitar imagen"
                }
                disabled={busy}
                onClick={() => {
                  onChange(
                    images
                      .filter((item) => item.id !== image.id)
                      .map((item, position) => ({ ...item, position })),
                  );
                  requestAnimationFrame(() =>
                    document.getElementById(`${uploadId}-button`)?.focus(),
                  );
                }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
