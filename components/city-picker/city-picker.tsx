import { getCitiesData } from "@/data";
import { CityCard } from "./city-card";

export async function CityPicker() {
  const cities = await getCitiesData();
  return (
    <nav aria-labelledby="markets-heading" className="w-full">
      <div className="mb-4 text-center">
        <h2 id="markets-heading" className="text-muted-foreground type-label">
          Choose a market
        </h2>
      </div>
      <ul className="mx-auto grid max-w-xl list-none gap-4 p-0 sm:max-w-3xl sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
        {cities.map((city) => (
          <CityCard key={city.slug} city={city} />
        ))}
      </ul>
    </nav>
  );
}
