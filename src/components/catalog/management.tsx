"use client";
import { useState } from "react";
import { saveCatalog, uploadCatalogImage } from "@/modules/catalog/actions";
import type { Catalog } from "@/modules/catalog/model";
import { CatalogManager } from "./manager";
export function CatalogManagement({
  initial,
  imageBase,
}: {
  initial: Catalog;
  imageBase: string;
}) {
  const [catalog, setCatalog] = useState(initial);
  return (
    <CatalogManager
      catalog={catalog}
      imageBase={imageBase}
      commit={async (next) => {
        const result = await saveCatalog(next);
        if (result.catalog) setCatalog(result.catalog);
        return { error: result.error };
      }}
      upload={async (file, productId) => {
        const form = new FormData();
        form.set("file", file);
        form.set("productId", productId);
        return uploadCatalogImage(form);
      }}
    />
  );
}
