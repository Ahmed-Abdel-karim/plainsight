import type { NextConfig } from "next";

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
