"use client";
import { useEffect, useState } from "react";
import { processRestockAlerts, saveCatalog, uploadCatalogImage } from "@/modules/catalog/actions";
import type { Catalog } from "@/modules/catalog/model";
import { CatalogManager } from "./manager";
import { readPurchaseCosts, savePurchaseCost } from "@/modules/admin/purchase-cost-actions";
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
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [costError, setCostError] = useState("");
  useEffect(() => {
    setCatalog(initial);
  }, [initial]);
  useEffect(() => {
    let mounted = true;
    void readPurchaseCosts().then((result) => { if (mounted) { setCosts(result.costs); setCostError(result.error ?? ""); } });
    return () => { mounted = false; };
  }, []);
  return (
    <CatalogManager
      catalog={catalog}
      imageBase={imageBase}
      costs={costs}
      costError={costError}
      saveCost={async (id, value) => {
        const result = await savePurchaseCost(id, value);
        if (!result.error) {
          setCosts((previous) => {
            const next = { ...previous };
            if (result.cost === null) delete next[id]; else next[id] = result.cost!;
            return next;
          });
        }
        return result;
      }}
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
