"use client";

import { type ReactNode } from "react";

import { useCityListingCount } from "./state";

function formatNumber(value: number): string {
  return value.toLocaleString("en");
}

/**
 * The active city's unfiltered snapshot total, shown in the market panel header
 * and mobile drawer trigger. Result-context counts live inside Analyse and
 * Browse; this baseline changes only when the city changes.
 */
export function CityListingCount({ fallback }: { fallback: ReactNode }) {
  const count = useCityListingCount();
  if (count === null) return <>{fallback}</>;

  return <>{formatNumber(count)} listings</>;
}
