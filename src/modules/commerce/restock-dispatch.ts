import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { restockMailConfig, sendRestockMail } from "./restock-mail";

type ClaimedAlert = {
  alert_id: string;
  variant_id: string;
  recipient: string;
  product_name: string | null;
  product_slug: string;
  flavor: string | null;
};

/** Invoked after an MFA administrator has committed a stock edit. */
export async function dispatchRestockAlerts(client: SupabaseClient) {
  const config = restockMailConfig();
  if (!config) return { sent: 0, failed: 0 };
  const { data, error } = await client.rpc("claim_restock_alerts", { p_limit: 20 });
  if (error) throw new Error("No pudimos consultar los avisos pendientes.");
  const alerts = (data ?? []) as ClaimedAlert[];
  let sent = 0,
    failed = 0;
  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];
    const name = alert.product_name?.trim() || "tu producto";
    const label = [name, alert.flavor?.trim()].filter(Boolean).join(" · ");
    const url = new URL(`/producto/${alert.product_slug}`, config.siteUrl);
    url.searchParams.set("variante", alert.variant_id);
    try {
      // Resend accepts idempotency keys for 24 hours; the same alert keeps its
      // key across a retry if the process stopped after the provider accepted it.
      const providerId = await sendRestockMail(config, {
        to: alert.recipient,
        key: `restock-available-${alert.alert_id}`,
        subject: `Volvió ${name} | STYLO`,
        text: `La presentación que seguías volvió a estar disponible: ${label}.\n\nPodés verla acá: ${url}\n\nLa disponibilidad puede cambiar. Este es el único aviso para esta solicitud.`,
      });
      const { error: completeError } = await client.rpc("complete_restock_alert", {
        p_alert_id: alert.alert_id,
        p_provider_id: providerId,
      });
      if (completeError) throw new Error("No pudimos registrar el envío.");
      sent++;
    } catch {
      await client.rpc("fail_restock_alert", { p_alert_id: alert.alert_id });
      failed++;
    }
    // The single-send endpoint is rate limited. Keep administration responsive
    // by doing this only after the catalog response has been returned.
    if (i < alerts.length - 1)
      await new Promise((resolve) => setTimeout(resolve, 550));
  }
  return { sent, failed };
}
