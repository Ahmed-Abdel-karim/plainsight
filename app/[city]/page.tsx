import { notFound } from "next/navigation";

import { CityScene } from "@/components/scene/city-scene";
import {
  getCitiesData,
  getCityBoundaries,
  getCityDataset,
  selectScopeAggregates,
} from "@/data";
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
  const [dataset, boundaries] = await Promise.all([
    getCityDataset(city),
    getCityBoundaries(city),
  ]);

  if (!dataset || !boundaries) {
    notFound();
  }
  // E1-S2: the chosen city is the default analysis scope until the user narrows.
  const scope: Scope = { type: "city" };
  const aggregates = selectScopeAggregates(dataset, scope);
  const cities = await getCitiesData();

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <div className="flex w-full flex-1 flex-col">
        <CityScene
          citySlug={dataset.slug}
          cityName={dataset.name}
          country={dataset.country}
          frame={dataset.frame}
          currency={dataset.currency}
          listingCount={aggregates.listingCount}
          snapshotLabel={dataset.snapshotLabel}
          aggregates={aggregates}
          neighbourhoods={dataset.neighbourhoods}
          priceScale={dataset.priceScale}
          cities={cities}
          boundaries={boundaries}
          bbox={dataset.bbox}
          center={dataset.center}
          neighbourhoodCount={dataset.neighbourhoods.length}
        />
      </div>
    </main>
  );
}
