import "server-only";
import { getEnvironment } from "@/lib/config/server";

export type RestockMailConfig = {
  apiKey: string;
  from: string;
  siteUrl: URL;
};

export function restockMailConfig(): RestockMailConfig | null {
  const environment = getEnvironment();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (
    process.env.RESTOCK_ALERTS_ENABLED !== "true" ||
    environment.environment === "local" ||
    !environment.supabase ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    environment.siteUrl.protocol !== "https:" ||
    !apiKey ||
    !from ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)
  )
    return null;
  return { apiKey, from, siteUrl: environment.siteUrl };
}

export function restockUrl(
  config: RestockMailConfig,
  path: string,
  token: string,
) {
  const url = new URL(path, config.siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendRestockMail(
  config: RestockMailConfig,
  input: { to: string; subject: string; text: string; key: string },
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.key,
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
  const data = (await response.json()) as { id?: unknown };
  if (typeof data.id !== "string" || !data.id)
    throw new Error("Resend no devolvió el identificador del envío.");
  return data.id;
}
