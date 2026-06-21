"use client";

import { type ReactNode } from "react";

import { useScopeListingCount } from "./state";

function formatNumber(value: number): string {
  return value.toLocaleString("en");
}

/**
 * The active scope's listing total as `"{n} listings"`, shown in the market
 * panel header and the mobile drawer trigger. Purely presentational — the
 * scope→count selection lives in `useScopeListingCount`, so this only formats
 * the result. The count follows a neighbourhood selection in lockstep with the
 * Browse list and map (no server round trip). The `fallback` covers the brief
 * window before the city actor is spawned (the two call sites want different
 * placeholders).
 */
export function ListingCount({ fallback }: { fallback: ReactNode }) {
  const count = useScopeListingCount();
  if (count === null) return <>{fallback}</>;

  return <>{formatNumber(count)} listings</>;
}
