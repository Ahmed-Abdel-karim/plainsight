import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CityScene } from "@/components/scene/city-scene";
import { getCitiesData, getCityMeta, type Scope } from "@/data";

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
  return {
    title: `Short-term rentals in ${meta.name}, ${meta.country} — Plainsight`,
    description: `Where short-term rentals are in ${meta.name}, what they cost, and who controls the market. Based on the ${meta.snapshotLabel} Inside Airbnb snapshot.`,
    // Filters live in the query string (shareable for humans) but each
    // `?rooms=…&price=…` permutation is the same indexable page — canonicalise
    // them all onto the bare city URL so crawlers don't index thin filter
    // variants (faceted-navigation duplication). Route groups don't affect the
    // path, so the canonical is `/<slug>`.
    alternates: { canonical: `/${meta.slug}` },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  // E1-S2: the chosen city is the default analysis scope until the user narrows.
  const scope: Scope = { type: "city" };
  // Gate the route on the cheap framing tier only: "the city exists" == its meta
  // exists. Everything heavier (boundaries, aggregates, the city index) is fetched
  // where it's rendered, behind its own Suspense boundary, so a slow tile-sized
  // read never blocks the analysis cards. Missing heavy tiers degrade gracefully
  // (zeroed aggregates; a map without choropleth), so they must not force a 404.
  const meta = await getCityMeta(city);
  if (!meta) {
    notFound();
  }
  const {
    slug,
    name,
    country,
    frame,
    currency,
    snapshotLabel,
    bbox,
    center,
    priceScale,
  } = meta;
  return (
    <CityScene
      citySlug={slug}
      cityName={name}
      country={country}
      frame={frame}
      currency={currency}
      snapshotLabel={snapshotLabel}
      scope={scope}
      bbox={bbox}
      center={center}
      priceScale={priceScale}
    />
  );
}
