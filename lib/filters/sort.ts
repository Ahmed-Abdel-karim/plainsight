import type { Listing } from "@/data/contract";
import type { SortKey } from "@/data/types";

/** Nulls always sort last regardless of direction. */
function compareNullableDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/**
 * Sort listings for the Browse list (E6-S5). Returns a NEW array; never mutates
 * the input. Pure and isomorphic — shared by the server `queryListings` path
 * and any client-side list rendering.
 */
export function sortListings(
  listings: readonly Listing[],
  sort: SortKey,
): Listing[] {
  const copy = [...listings];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price_desc":
      return copy.sort((a, b) => b.price - a.price);
    case "reviews_desc":
      return copy.sort((a, b) =>
        compareNullableDesc(a.reviewsPerMonth, b.reviewsPerMonth),
      );
    case "review_count_desc":
      return copy.sort((a, b) => b.numberOfReviews - a.numberOfReviews);
  }
}
