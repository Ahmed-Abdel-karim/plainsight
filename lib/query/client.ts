import { QueryCache, QueryClient } from "@tanstack/react-query";

import { notifyError } from "@/lib/toast";
import { queryDefaults } from "./config";

/**
 * Surfaces a toast when a main-thread fetch fails for good (after retries).
 * Keyed by the query's root key so each tier gets its own copy and a stable,
 * deduplicated toast. The listings worker runs its own client in the worker
 * thread, so analytics failures are handled there (city machine), not here.
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
    case "browse-points":
      return notifyError(
        "browse-points",
        "Couldn't load listings",
        "Try reloading the page.",
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
