import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emptyCatalog, type Catalog } from "./model";
import { cache } from "react";

export const getCatalog = cache(
  async (): Promise<{
    catalog: Catalog;
    configured: boolean;
    error: boolean;
  }> => {
    const client = await createSupabaseServerClient();
    if (!client)
      return { catalog: emptyCatalog, configured: false, error: false };
    try {
      const { data, error } = await client.rpc("catalog_snapshot");
      const failed =
        Boolean(error) ||
        !data ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.brands) ||
        !Array.isArray(data.categories);
      return {
        catalog: failed ? emptyCatalog : (data as Catalog),
        configured: true,
        error: failed,
      };
    } catch {
      return { catalog: emptyCatalog, configured: true, error: true };
    }
  },
);
