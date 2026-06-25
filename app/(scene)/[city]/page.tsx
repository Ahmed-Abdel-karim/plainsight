import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SceneView } from "@/features/scene";
import { getCitiesData, getCityMeta } from "@/data";

export async function generateStaticParams() {
  const cities = await getCitiesData();

  return cities.map((city) => ({
    city: city.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const meta = await getCityMeta(city);
  if (!meta) return {};
  const title = `Short-term rentals in ${meta.name}, ${meta.country} — Plainsight`;
  const description = `Where short-term rentals are in ${meta.name}, what they cost, and who controls the market. Based on the ${meta.snapshotLabel} Inside Airbnb snapshot.`;
  return {
    title,
    description,
    alternates: { canonical: `/${meta.slug}` },
    // OG/Twitter image inherited from app/opengraph-image.tsx.
    openGraph: {
      type: "website",
      siteName: "Plainsight",
      title,
      description,
      url: `/${meta.slug}`,
      locale: "en_GB",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CityPage({ params }: PageProps<"/[city]">) {
  const { city } = await params;
  const meta = await getCityMeta(city);
  if (!meta) {
    notFound();
  }
  return <SceneView cityMeta={meta} />;
}
