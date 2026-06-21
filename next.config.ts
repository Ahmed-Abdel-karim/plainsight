import type { NextConfig } from "next";
// Sentry is wired but disabled for now. To enable: uncomment this import and
// the withSentryConfig export at the bottom, and flip `enabled` in the
// sentry.*.config / instrumentation-client files.
// import { withSentryConfig } from "@sentry/nextjs";

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
