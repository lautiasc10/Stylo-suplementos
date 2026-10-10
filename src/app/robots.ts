import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Todo el proyecto permanece fuera de indexación hasta el lanzamiento aprobado.
  return { rules: { userAgent: "*", disallow: "/" } };
}
