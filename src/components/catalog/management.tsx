"use client";
import { useEffect, useState } from "react";
import { processRestockAlerts, saveCatalog, uploadCatalogImage } from "@/modules/catalog/actions";
import type { Catalog } from "@/modules/catalog/model";
import { CatalogManager } from "./manager";
export function CatalogManagement({
  initial,
  imageBase,
  onSaved,
  restockAvailable = false,
}: {
  initial: Catalog;
  imageBase: string;
  onSaved?: (catalog: Catalog) => void;
  restockAvailable?: boolean;
}) {
  const [catalog, setCatalog] = useState(initial);
  useEffect(() => {
    setCatalog(initial);
  }, [initial]);
  return (
    <CatalogManager
      catalog={catalog}
      imageBase={imageBase}
      dispatchPending={restockAvailable ? processRestockAlerts : undefined}
      commit={async (next) => {
        const result = await saveCatalog(next);
        if (result.catalog) {
          setCatalog(result.catalog);
          onSaved?.(result.catalog);
        }
        return { error: result.error };
      }}
      upload={async (file, productId, purpose) => {
        const form = new FormData();
        form.set("file", file);
        form.set("productId", productId);
        form.set("purpose", purpose);
        return uploadCatalogImage(form);
      }}
    />
  );
}
