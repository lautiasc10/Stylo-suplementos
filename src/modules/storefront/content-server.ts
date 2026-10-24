import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getEnvironment } from "@/lib/config/server";
import { buenosAiresMonthBounds } from "@/modules/admin/monthly-sales";

export type MonthlyRank = { productId: string; variantId: string };
const readPublicSnapshot = unstable_cache(
  async (
    month: string,
  ): Promise<{ teamApplications: boolean; ranking: MonthlyRank[] }> => {
    const unavailable = { teamApplications: false, ranking: [] };
    const config = getEnvironment().supabase;
    if (!config || !Number.isFinite(Date.parse(month))) return unavailable;
    // This function returns identical aggregate data for everyone: never attach
    // a visitor/admin session or cache a cookie-bound private client here.
    const client = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      const { data, error } = await client.rpc("storefront_content_snapshot");
      if (error || !data || !Array.isArray(data.ranking)) return unavailable;
      const uuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ranking = data.ranking
        .filter(
          (row: MonthlyRank) =>
            row && uuid.test(row.productId) && uuid.test(row.variantId),
        )
        .slice(0, 3);
      return { teamApplications: data.teamApplications === true, ranking };
    } catch {
      return unavailable;
    }
  },
  ["storefront-public-content-v1"],
  { revalidate: 60 },
);

export const readStorefrontContent = cache(() =>
  readPublicSnapshot(buenosAiresMonthBounds(new Date()).start),
);
