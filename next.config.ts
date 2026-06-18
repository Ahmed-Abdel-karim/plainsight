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
  // The repository + endpoint read `data/cities/{slug}-*.{json,geojson}` with a
  // dynamic (slug-interpolated) path, which the file tracer can't resolve
  // statically — so the files must be bundled into the relevant serverless
  // functions explicitly. Only matters at `next build`/deploy; `next dev` reads
  // the real filesystem. (Keys are route paths; confirm the route-group key
  // resolves at the first deploy — it's invisible locally.)
  outputFileTracingIncludes: {
    "/api/cities/[slug]/[tier]": ["./data/cities/**"],
    "/api/cities": ["./data/cities/cities.json"],
    "/(scene)/[city]": [
      "./data/cities/*-meta.json",
      "./data/cities/*-aggregates.json",
      "./data/cities/*-boundaries.geojson",
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
