import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emptyPromotions,
  validatePromotions,
  type PromotionState,
} from "./promotions";
export const readPromotions = cache(
  async (): Promise<{ state: PromotionState; error: boolean }> => {
    const client = await createSupabaseServerClient();
    if (!client) return { state: emptyPromotions, error: false };
    try {
      const result = await client.rpc("commerce_promotions");
      if (
        result.error ||
        !result.data ||
        !Number.isInteger(result.data.revision) ||
        validatePromotions(result.data.promotions).length
      )
        return { state: emptyPromotions, error: true };
      return { state: result.data as PromotionState, error: false };
    } catch {
      return { state: emptyPromotions, error: true };
    }
  },
);
