import type { Metadata } from "next";

export const SITE_NAME = "STYLO Suplementos";
export const SITE_DESCRIPTION =
  "Suplementación deportiva, accesorios y bienestar. Conocé STYLO Suplementos en Rosario, Argentina.";
export const SITE_TITLE = `${SITE_NAME} | Potenciá tu mejor versión`;

export function absoluteHttpUrl(
  value: string,
  siteUrl: URL,
): string | undefined {
  try {
    const url = new URL(value, siteUrl);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** No launch/indexing switch: the existing noindex policy remains inherited. */
export function pageMetadata({
  title,
  description,
  path,
  siteUrl,
  images = [],
  home = false,
}: {
  title: string;
  description: string;
  path: string;
  siteUrl: URL;
  images?: { url: string; alt: string }[];
  home?: boolean;
}): Metadata {
  const url = new URL(path, siteUrl).href;
  const socialTitle = home ? title : `${title} | ${SITE_NAME}`;
  const photos = images.length
    ? images
    : [
        {
          url: new URL("/branding/logo-completo.webp", siteUrl).href,
          alt: SITE_NAME,
        },
      ];
  return {
    title: home ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      url,
      images: photos,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: photos,
    },
  };
}

/** Keep JSON data inside its script element even with hostile catalog text. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
