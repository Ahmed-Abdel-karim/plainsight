/**
 * The scope narrow — the first stage of every projection. Pure and free of any
 * worker/DOM globals so it is unit-testable on its own and runs identically in
 * the worker, the Browse live-twin, and an offline generator. Generic over the
 * row shape: it reads a single field, so anything carrying a `neighbourhoodId`
 * (`Listing`, `BrowsePointProperties`, …) flows through unchanged.
 */
import type { Scope } from "@/data/types";

/** The one field the scope narrow reads — the minimal interface it accepts. */
export interface ScopableListing {
  readonly neighbourhoodId: string;
}

/** Narrow listings to the active scope (city-wide or one neighbourhood). */
export function scopeListings<T extends ScopableListing>(
  listings: readonly T[],
  scope: Scope,
): readonly T[] {
  if (scope.type === "city") return listings;
  return listings.filter((l) => l.neighbourhoodId === scope.id);
}
