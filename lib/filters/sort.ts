import type { Listing } from "@/data/contract";
import type { SortKey } from "@/data/types";

/**
 * The fields any sortable listing row must carry. Both the full `Listing` and
 * the Browse-tier `BrowsePointProperties` satisfy it structurally, so the SAME
 * comparator orders the Analyse path and the Browse list/dots — no duplicate
 * sort logic (constitution V).
 */
export type SortableListing = Pick<
  Listing,
  "id" | "price" | "reviewsPerMonth" | "numberOfReviews"
>;

/** Nulls always sort last regardless of direction. */
function compareNullableDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/** Stable tie-break by listing id so equal-key rows keep a deterministic order. */
function byKeyThenId<T extends SortableListing>(
  key: (row: T) => number,
): (a: T, b: T) => number {
  return (a, b) => key(a) - key(b) || a.id - b.id;
}

/**
 * Sort listings for the Browse list (E6-S5). Returns a NEW array; never mutates
 * the input. Pure and isomorphic — shared by the server `queryListings` path,
 * the Browse list rendering, and any client-side list. Generic over the row
 * shape so it accepts both `Listing` and `BrowsePointProperties`.
 *
 * Ties break by listing id for a stable, deterministic order across renders.
 */
export function sortListings<T extends SortableListing>(
  listings: readonly T[],
  sort: SortKey,
): T[] {
  const copy = [...listings];
  switch (sort) {
    case "price_asc":
      return copy.sort(byKeyThenId((l) => l.price));
    case "price_desc":
      return copy.sort(byKeyThenId((l) => -l.price));
    case "reviews_desc":
      return copy.sort(
        (a, b) =>
          compareNullableDesc(a.reviewsPerMonth, b.reviewsPerMonth) ||
          a.id - b.id,
      );
    case "review_count_desc":
      return copy.sort(byKeyThenId((l) => -l.numberOfReviews));
  }
}
