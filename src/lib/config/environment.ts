type EnvironmentSource = Record<string, string | undefined>;

export function readEnvironment(source: EnvironmentSource) {
  const environment = source.APP_ENV ?? "local";
  if (!["local", "staging", "production"].includes(environment)) {
    throw new Error("APP_ENV debe ser local, staging o production.");
  }
  const siteUrl = new URL(source.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  if (!["http:", "https:"].includes(siteUrl.protocol)) throw new Error("URL del sitio inválida.");
  if (environment === "production" && siteUrl.protocol !== "https:") {
    throw new Error("Producción requiere una URL HTTPS explícita.");
  }
  const url = source.SUPABASE_URL?.trim();
  const key = source.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (Boolean(url) !== Boolean(key)) throw new Error("Completá URL y clave pública de Supabase juntas.");
  if (url) {
    const parsed = new URL(url);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(environment === "local" && loopback && parsed.protocol === "http:")) {
      throw new Error("Supabase requiere HTTPS, excepto en desarrollo local.");
    }
  }
  if (key?.startsWith("sb_secret_")) throw new Error("Usá una clave publishable, nunca una clave secreta.");
  if (key?.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
      if (payload.role !== "anon") throw new Error();
    } catch {
      throw new Error("La clave legacy debe ser anon, nunca service_role.");
    }
  }
  return { environment, siteUrl, supabase: url && key ? { url, key } : null };
}
