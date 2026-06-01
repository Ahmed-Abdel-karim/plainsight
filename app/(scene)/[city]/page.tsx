import { notFound } from "next/navigation";

import { CityScene } from "@/components/scene/city-scene";
import { getCitiesData } from "@/data";
import { getRepository } from "@/data";
import type { Scope } from "@/data";

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
  const repo = getRepository();
  const [meta, boundaries, aggregates, neighbourhoods] = await Promise.all([
    repo.getCityMeta(city),
    repo.getBoundaries(city),
    repo.getScopeAggregates(city, scope),
    repo.getNeighbourhoods(city),
  ]);

  if (!meta || !boundaries || !aggregates) {
    notFound();
  }
  const cities = await getCitiesData();

  return (
    <CityScene
      citySlug={meta.slug}
      cityName={meta.name}
      country={meta.country}
      frame={meta.frame}
      currency={meta.currency}
      listingCount={aggregates.listingCount}
      snapshotLabel={meta.snapshotLabel}
      aggregates={aggregates}
      neighbourhoods={neighbourhoods}
      priceScale={meta.priceScale}
      cities={cities}
      boundaries={boundaries}
      bbox={meta.bbox}
      center={meta.center}
      neighbourhoodCount={neighbourhoods.length}
    />
  );
}
