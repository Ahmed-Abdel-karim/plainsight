import { notFound } from "next/navigation";

import { CityScene } from "@/components/scene/city-scene";
import { getCitiesData, getCityMeta, type Scope } from "@/data";

export async function generateStaticParams() {
  const cities = await getCitiesData();

  return cities.map((city) => ({
    city: city.slug,
  }));
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
  const { slug, name, country, frame, currency, snapshotLabel, bbox, center } =
    meta;
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
    />
  );
}
