/**
 * Pure helpers the worker's processes run over the in-memory city listings. Kept
 * free of any worker/DOM globals so they are unit-testable on their own and share
 * the exact isomorphic `@/lib/filters` engine the server's filtered path uses —
 * the client and server can never disagree on what "the filtered set" is.
 */
import type { Listing } from "@/data/contract";
import type { Scope } from "@/data/types";

/** Narrow the city listings to the active scope (city-wide or one neighbourhood). */
export function scopeListings(
  listings: readonly Listing[],
  scope: Scope,
): readonly Listing[] {
  if (scope.type === "city") return listings;
  return listings.filter((l) => l.neighbourhoodId === scope.id);
}
