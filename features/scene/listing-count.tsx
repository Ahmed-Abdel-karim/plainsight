import { type ReactNode } from "react";

import { getScopeListingCount } from "@/data";
import type { Scope } from "@/data/types";
import { AsyncBoundary } from "@/components/utils/async-boundary";

function formatNumber(value: number): string {
  return value.toLocaleString("en");
}

/**
 * Streams the active scope's listing count as `"{n} listings"`. Co-located with
 * the places that show it (the market panel header and the mobile drawer trigger) so
 * it resolves on its own cheap cube read behind a Suspense boundary instead of
 * being hoisted to the page and threaded down as a prop. The read is O(1) off
 * the already-cached aggregate cube, deduped by `"use cache"` across call sites.
 *
 * The two call sites want different placeholders (inline vs. trigger), so the
 * `fallback` is passed in rather than baked into the boundary here.
 */
export function ListingCount({
  citySlug,
  scope,
  fallback,
}: {
  citySlug: string;
  scope: Scope;
  fallback: ReactNode;
}) {
  const scopeId = scope.type === "neighbourhood" ? scope.id : undefined;
  return (
    <AsyncBoundary
      data={() => getScopeListingCount(citySlug, scope.type, scopeId)}
      Component={({ data }) => <>{formatNumber(data ?? 0)} listings</>}
      fallback={fallback}
    />
  );
}
