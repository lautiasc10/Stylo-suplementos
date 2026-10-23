import type { NextConfig } from "next";

const mediaUrl = process.env.SUPABASE_URL?.trim();
const mediaHost = mediaUrl ? new URL(mediaUrl) : null;
const immutableMediaHeaders = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    qualities: [75, 85],
    remotePatterns:
      mediaHost?.protocol === "https:"
        ? [
            {
              protocol: "https",
              hostname: mediaHost.hostname,
              port: mediaHost.port,
              pathname: "/storage/v1/object/public/product-media/**",
              search: "",
            },
          ]
        : [],
  },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    return [
      {
        // Public cinematic assets use versioned filenames. Reuse their bytes
        // on return visits; publish any edit under a new versioned name.
        source: "/visuals/:path*",
        headers: immutableMediaHeaders,
      },
      {
        // Only versioned WebP derivatives; originals and reports keep their
        // revalidation policy. Any edited decoration needs a new vN filename.
        source: "/sabores/:asset([a-z-]+-decor-v[0-9]+\\.webp)",
        headers: immutableMediaHeaders,
      },
      {
        source: "/sabores/mobile/:asset([a-z-]+-decor-v[0-9]+\\.webp)",
        headers: immutableMediaHeaders,
      },
      {
        // The normalization pipeline hashes the original and never overwrites
        // an export. Keep report.json outside this immutable rule.
        source:
          "/media/:collection(normalization-trial-v1|products-normalized-v1|onefit-normalized-v1|catalog-normalized-v2)/:asset([a-zA-Z0-9_-]+\\.webp)",
        headers: immutableMediaHeaders,
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
