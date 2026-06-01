import type { NeighbourhoodBoundaries } from "@/data";
import { MapView } from "./map";
import { MapLegend } from "./map-legend";

interface MapRegionProps {
  boundaries: NeighbourhoodBoundaries | null;
  bbox: [number, number, number, number];
  center: [number, number];
  cityName: string;
  neighbourhoodCount: number;
}

export function MapRegion({
  boundaries,
  bbox,
  center,
  cityName,
  neighbourhoodCount,
}: MapRegionProps) {
  if (!boundaries || boundaries.features.length === 0) {
    return (
      <section
        aria-label="Map"
        className="bg-map-bg relative min-h-96 flex-1 overflow-hidden lg:min-h-0"
      >
        <p className="text-map-label absolute inset-0 flex items-center justify-center type-label">
          Map unavailable
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Map"
      className="bg-map-bg relative min-h-96 flex-1 overflow-hidden lg:min-h-0"
    >
      <MapView
        boundaries={boundaries}
        bbox={bbox}
        center={center}
        cityName={cityName}
      />
      <MapLegend neighbourhoodCount={neighbourhoodCount} />
    </section>
  );
}
