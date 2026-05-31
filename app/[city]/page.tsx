import { notFound } from "next/navigation";

import { CityScene } from "@/components/scene/city-scene";
import { getCitiesData, getCityDataset, selectScopeAggregates } from "@/data";
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
  const dataset = await getCityDataset(city);

  if (!dataset) {
    notFound();
  }

  // E1-S2: the chosen city is the default analysis scope until the user narrows.
  const scope: Scope = { type: "city" };
  const aggregates = selectScopeAggregates(dataset, scope);

  return (
    <main className="flex min-h-screen flex-col bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
        <CityScene
          cityName={dataset.name}
          listingCount={aggregates.listingCount}
        />
      </div>
    </main>
  );
}
