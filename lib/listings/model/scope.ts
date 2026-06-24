/**
 * The neighbourhood narrow — the first stage of every projection. Pure and free
 * of any worker/DOM globals so it is unit-testable on its own and runs
 * identically in the worker, the Browse live-twin, and an offline generator.
 * Generic over the row shape: it reads a single field, so anything carrying a
 * `neighbourhoodId` (`Listing`, `BrowsePointProperties`, …) flows through.
 */

/** The one field the narrow reads — the minimal interface it accepts. */
export interface ScopableListing {
  readonly neighbourhoodId: string;
}

/** Narrow listings to one neighbourhood; `null` is whole-city (pass-through). */
export function narrowToNeighbourhood<T extends ScopableListing>(
  neighbourhood: string | null,
) {
  return function (listings: readonly T[]): readonly T[] {
    if (neighbourhood === null) return listings;
    return listings.filter((l) => l.neighbourhoodId === neighbourhood);
  };
}
