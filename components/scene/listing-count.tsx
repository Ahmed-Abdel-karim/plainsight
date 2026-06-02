import { getSidebarListingCount, type Scope } from "@/data";

function formatNumber(value: number): string {
  return value.toLocaleString("en");
}

/**
 * Streams the active scope's listing count as `"{n} listings"`. Co-located with
 * the places that show it (the sidebar header and the mobile drawer trigger) so
 * it resolves on its own cheap cube read behind a Suspense boundary instead of
 * being hoisted to the page and threaded down as a prop. The read is O(1) off
 * the already-cached aggregate cube, deduped by `"use cache"` across call sites.
 */
export async function ListingCount({
  citySlug,
  scope,
}: {
  citySlug: string;
  scope: Scope;
}) {
  const scopeId = scope.type === "neighbourhood" ? scope.id : undefined;
  const count = await getSidebarListingCount(citySlug, scope.type, scopeId);
  return <>{formatNumber(count ?? 0)} listings</>;
}
