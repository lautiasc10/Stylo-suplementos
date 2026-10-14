import type { NextConfig } from "next";

const mediaUrl = process.env.SUPABASE_URL?.trim();
const mediaHost = mediaUrl ? new URL(mediaUrl) : null;

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
