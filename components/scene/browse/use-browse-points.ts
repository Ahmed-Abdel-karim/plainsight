"use client";

/**
 * Shared, lazy, ref-counted access to a city's Browse tier
 * (`/api/cities/{slug}/points`).
 *
 * Browse mounts the same surface twice (desktop sidebar + mobile drawer) and the
 * map needs the SAME parsed features for its dot source — a naive per-consumer
 * fetch would pull the multi-megabyte tier several times. This registry keeps
 * ONE parsed `FeatureCollection` per slug and hands it to every consumer.
 *
 * It is **lazy**: the fetch starts only once a consumer passes `enabled` — i.e.
 * the first time Browse is activated for the slug. The parsed collection is then
 * cached for the session (the tier is static), so toggling Analyse↔Browse never
 * re-fetches (SC-001). The listings worker is untouched — Browse needs no worker.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { BrowsePoint, BrowsePointProperties } from "@/data/contract";
import type { ListingFilters, Scope, SortKey } from "@/data/types";
import { filterListings, sortListings } from "@/lib/filters";

export type BrowsePointsStatus = "loading" | "ready" | "error";

export type BrowseCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  BrowsePointProperties
>;

export interface UseBrowsePointsResult {
  status: BrowsePointsStatus;
  collection: BrowseCollection | null;
}

/**
 * Shared, stable `loading` snapshot. Used as the server snapshot (and the
 * pre-fetch client snapshot), so SSR and the hydration render always agree —
 * `useSyncExternalStore` swaps to the live client snapshot only after hydration.
 */
const LOADING: UseBrowsePointsResult = { status: "loading", collection: null };

interface Entry {
  status: BrowsePointsStatus;
  collection: BrowseCollection | null;
  refs: number;
  listeners: Set<() => void>;
  // Cached, identity-stable snapshot for `getSnapshot` — re-created only when the
  // status/collection actually changes, so `useSyncExternalStore` doesn't loop.
  snapshot: UseBrowsePointsResult;
}

const registry = new Map<string, Entry>();

function acquire(slug: string): Entry {
  let entry = registry.get(slug);
  if (!entry) {
    const created: Entry = {
      status: "loading",
      collection: null,
      refs: 0,
      listeners: new Set(),
      snapshot: LOADING,
    };
    registry.set(slug, created);
    fetch(`/api/cities/${slug}/points`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<BrowseCollection>;
      })
      .then((collection) => {
        created.status = "ready";
        created.collection = collection;
        created.snapshot = { status: "ready", collection };
      })
      .catch(() => {
        created.status = "error";
        created.snapshot = { status: "error", collection: null };
      })
      .finally(() => created.listeners.forEach((notify) => notify()));
    entry = created;
  }
  entry.refs += 1;
  return entry;
}

function release(slug: string): void {
  const entry = registry.get(slug);
  if (!entry) return;
  entry.refs -= 1;
  // The parsed collection stays cached at refs 0 — it is static, and re-parsing
  // ~62k features on every lens toggle would blow the SC-001 swap budget.
}

/**
 * The shared points collection for `slug` while `enabled`, with its load status.
 * While `loading` the list shows a skeleton and the map draws no dots; on
 * `error` the lens still toggles and the list shows the empty/error affordance.
 *
 * Backed by `useSyncExternalStore` over the module registry. The server snapshot
 * is always `loading` (the geojson is a client-only fetch), so the Browse slot —
 * now server-rendered when `?lens=browse` is SSR-correct — hydrates from the same
 * `loading` state on both sides. Post-hydration, `getSnapshot` reads the registry
 * directly, so an in-session Analyse↔Browse toggle still shows the already-cached
 * collection with no loading flash (SC-001).
 */
export function useBrowsePoints(
  slug: string,
  { enabled }: { enabled: boolean },
): UseBrowsePointsResult {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled) return () => {};
      const entry = acquire(slug);
      entry.listeners.add(onStoreChange);
      return () => {
        entry.listeners.delete(onStoreChange);
        release(slug);
      };
    },
    [slug, enabled],
  );

  const getSnapshot = useCallback(
    () => (enabled ? (registry.get(slug)?.snapshot ?? LOADING) : LOADING),
    [slug, enabled],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING);
}

/**
 * The filtered + sorted list rows for the active scope, filters, and sort key.
 * Memoised: features → scope narrow → `filterListings` (price/room) →
 * `sortListings` (the shared comparator). Recomputes only when one of those
 * changes — ~30–60 ms over London's ~62k, within the 300 ms budget (SC-003).
 */
export function useBrowseListings(
  collection: BrowseCollection | null,
  scope: Scope,
  filters: ListingFilters,
  sort: SortKey,
): BrowsePointProperties[] {
  const scopeId = scope.type === "neighbourhood" ? scope.id : null;
  return useMemo(() => {
    if (!collection) return [];
    const rows = collection.features.map(
      (feature: BrowsePoint) => feature.properties,
    );
    // Scope narrow — the live twin of `scopeListings` (a single equality, kept
    // inline so the Browse chunk doesn't pull the worker's hex aggregation).
    const scoped =
      scopeId === null
        ? rows
        : rows.filter((row) => row.neighbourhoodId === scopeId);
    return sortListings(filterListings(scoped, filters), sort);
  }, [collection, scopeId, filters, sort]);
}
