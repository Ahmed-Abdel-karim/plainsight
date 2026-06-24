import type { CityData } from "@/data/types";

/**
 * Shaped `CityData` the city picker view renders. Hand-authored (not the
 * production JSON) so the display-layer tests own their expectations and can
 * exercise rendering edges like thousands-grouped `listings`.
 */
export const cityFixtures: CityData[] = [
  {
    slug: "london",
    snapshotId: "2025-09",
    name: "London",
    country: "United Kingdom",
    frame: "Largest market despite licensing",
    listings: "61,963 listings",
    snapshotLabel: "9/2025",
  },
  {
    slug: "berlin",
    snapshotId: "2025-09",
    name: "Berlin",
    country: "Germany",
    frame: "Well-regulated mid-market",
    listings: "9,264 listings",
    snapshotLabel: "9/2025",
  },
];
