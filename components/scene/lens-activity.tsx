"use client";

import { Activity, type ReactNode } from "react";

import { useLens } from "./use-lens";

/**
 * Toggles the sidebar's Analyse/Browse content by the `lens` URL param using
 * React's `<Activity>` (FR-002). Both subtrees stay mounted so their state
 * survives a toggle, while the hidden one's effects are deferred — so the Browse
 * points fetch / Analyse worker still start lazily, the first time their tab is
 * shown. Replaces the old conditional `LensSidebar` swap. The route reads `lens`
 * server-side (see `CityScene`), so `useLens` is SSR-correct — no hydration gate.
 *
 * The shared `FilterPanel` + footer sit *outside* this toggle (rendered once,
 * visible in both tabs); only the tab-specific middle is switched here.
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
