import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    qualities: [50, 75],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
