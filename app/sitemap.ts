import type { MetadataRoute } from "next";

import { getCitiesData } from "@/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await getCitiesData();

  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    ...cities.map((city) => ({
      url: `${SITE_URL}/${city.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
