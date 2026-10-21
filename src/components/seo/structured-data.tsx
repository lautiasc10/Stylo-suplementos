import { serializeJsonLd } from "@/modules/seo/metadata";

export function StructuredData({ value }: { value: unknown }) {
  if (!value) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(value) }}
    />
  );
}
