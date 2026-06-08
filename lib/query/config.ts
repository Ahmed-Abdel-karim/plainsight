import type { DefaultOptions } from "@tanstack/query-core";

/**
 * Shared TanStack Query defaults: capped-exponential retry, session-lifetime
 * cache (every tier we fetch is a static file). Used by both the listings
 * worker's `@tanstack/query-core` client and the app's React Query provider so
 * a main-thread fetch *feels* like every other fetch — one place, one behaviour.
 */
export const queryDefaults: DefaultOptions = {
  queries: {
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    staleTime: Infinity,
    gcTime: Infinity,
  },
};
