"use client";

import { Activity, type ReactNode } from "react";

import { useLens } from "./shared/use-lens";

/**
 * Toggles the market panel's Analyse/Browse content by the `lens` URL param using
 * React's `<Activity>`. Both subtrees stay mounted so their state
 * survives a toggle, while the hidden one's effects are deferred — so the Browse
 * points fetch / Analyse worker still start lazily, the first time their tab is
 * shown.
 *
 * The shared `FilterPanel` + provenance footer sit outside this toggle; only the
 * tab-specific middle is switched here.
 */
export function LensActivity({
  analysis,
  browse,
}: {
  analysis: ReactNode;
  browse: ReactNode;
}) {
  const { isBrowse } = useLens();

  return (
    <>
      <Activity mode={isBrowse ? "hidden" : "visible"}>{analysis}</Activity>
      <Activity mode={isBrowse ? "visible" : "hidden"}>{browse}</Activity>
    </>
  );
}
