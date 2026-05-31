import { notFound } from "next/navigation";

import { getCitiesData, getCityDataset } from "@/data";

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

  return (
    <main className="flex min-h-screen flex-col bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <p className="text-muted-foreground type-label">Market selected</p>
        <h1 className="type-display">{dataset.name}</h1>
        <p className="max-w-2xl text-muted-foreground type-body">
          {dataset.snapshotLabel.trim()} snapshot ·{" "}
          {dataset.cityAggregates.listingCount.toLocaleString("en")} listings
        </p>
      </div>
    </main>
  );
}
