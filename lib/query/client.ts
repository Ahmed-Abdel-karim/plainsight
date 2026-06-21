import { QueryCache, QueryClient } from "@tanstack/react-query";

import { notifyError } from "@/lib/toast";
import { queryDefaults } from "./config";

/**
 * Surfaces a toast when a main-thread fetch fails for good (after retries) — but
 * only for tiers the query layer *owns*. Active lens-load failures belong to the
 * city lifecycle, which already toasts them via `SceneNotifications`:
 *   - `browse-points` is the active Browse load (the city's `loadBrowsePoints`
 *     actor fails → `city.error`), so the query layer stays silent to avoid a
 *     second, competing notification.
 *   - analytics runs in the worker thread's own client, handled by the city
 *     machine there.
 * Only optional/background tiers (boundaries) are toasted here, keyed by the
 * query's root key for a stable, deduplicated toast.
 */
function notifyOnQueryError(
  _error: unknown,
  query: { queryKey: readonly unknown[] },
) {
  switch (query.queryKey[0]) {
    case "boundaries":
      return notifyError(
        "boundaries",
        "Couldn't load map areas",
        "Neighbourhood outlines may be missing.",
      );
  }
}

/**
 * The main-thread React Query client, carrying the shared defaults and the
 * fetch-error → toast wiring. `retry` is overridable so tests can disable it and
 * still exercise the real `onError` path (rather than re-implementing it).
 */
export function makeQueryClient(options?: {
  retry?: boolean | number;
}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      ...queryDefaults,
      queries: {
        ...queryDefaults.queries,
        ...(options?.retry !== undefined ? { retry: options.retry } : {}),
      },
    },
    queryCache: new QueryCache({ onError: notifyOnQueryError }),
  });
}
