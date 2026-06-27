"use client";

import { useSyncExternalStore } from "react";

// Tailwind's `lg` breakpoint — the point at which the scene switches from the
// mobile drawer to the persistent desktop sidebar.
const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * `true` at the `lg` breakpoint and up. Server-renders and first-hydrates as
 * desktop (the common case study-review case), then settles to the real viewport
 * after mount — `useSyncExternalStore` reconciles the two without a hydration
 * mismatch. Drives which single presentation the scene mounts (see
 * `scene-panels.tsx`), so only one heavy market-panel tree is ever live.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}
