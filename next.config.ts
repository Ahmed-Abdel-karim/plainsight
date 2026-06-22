import type { NextConfig } from "next";
// Sentry is wired but disabled for now. To enable: uncomment this import and
// the withSentryConfig export at the bottom, and flip `enabled` in the
// sentry.*.config / instrumentation-client files.
// import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV !== "production";

// Off-origin host for the immutable city-data tiers, when one is configured.
// Default delivery is same-origin (`/city-assets`), so this is usually null.
const assetCdn = process.env.NEXT_PUBLIC_CITY_ASSET_BASE_URL?.trim();
const assetCdnOrigin =
  assetCdn && /^https?:\/\//.test(assetCdn) ? new URL(assetCdn).origin : null;

// Content-Security-Policy. Sources are scoped to exactly what the app loads:
//   - script:  inline is permitted because next-themes' pre-hydration theme
//              script and Next's bootstrap/hydration payloads are inline and we
//              run no nonce pipeline; dev adds 'unsafe-eval' for Turbopack HMR.
//   - style:   MapLibre, Radix, and vaul write inline style attributes at runtime.
//   - img:     data:/blob: for the WebGL canvas + sprites, Unsplash for listing
//              photos (also proxied via /_next/image), OpenFreeMap for sprites.
//   - connect: OpenFreeMap serves the style JSON, tiles, glyphs, and sprites;
//              city tiers are same-origin unless an asset CDN is configured.
//   - worker:  MapLibre spawns render workers from blob: URLs; the listings
//              worker is bundled (self).
const contentSecurityPolicy = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://images.unsplash.com https://tiles.openfreemap.org`,
  `font-src 'self'`,
  `connect-src 'self' https://tiles.openfreemap.org${assetCdnOrigin ? ` ${assetCdnOrigin}` : ""}`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  turbopack: {
    // Avoid inferring /home/u/src as the workspace root when parent lockfiles exist.
    root: process.cwd(),
  },
  images: {
    qualities: [50, 75],
    formats: ["image/avif", "image/webp"],
    // Listing photos are fetched from Unsplash's CDN to simulate a real listing
    // image host. Scoped narrowly (protocol/hostname/pathname) per the Next 16
    // security guidance — never a bare wildcard.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/city-assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  // Only server-rendered tiers need function tracing. Browser-facing immutable
  // tiers are delivered from public storage or the configured CDN.
  outputFileTracingIncludes: {
    "/(scene)/[city]": [
      "./data/snapshots/manifest.json",
      "./data/snapshots/*/*/meta.json",
      "./data/snapshots/*/*/aggregates.json",
    ],
  },
};

export default nextConfig;

// --- Sentry (disabled). To enable, replace the export above with this: ---
// export default withSentryConfig(nextConfig, {
//   org: "ahmed-abdelkarim",
//   project: "plainsight",
//   authToken: process.env.SENTRY_AUTH_TOKEN, // readable prod stack traces
//   widenClientFileUpload: true,
//   silent: !process.env.CI,
//   tunnelRoute: "/monitoring", // bypass ad-blockers
//   telemetry: false,
// });
