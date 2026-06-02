"use client";

/**
 * Shared, lazy, ref-counted access to a city's listings Web Worker.
 *
 * The analysis sidebar mounts twice (desktop `SidebarContent` + mobile
 * `SceneDrawer`), so a naive per-instance worker would fetch the multi-megabyte
 * listings feed twice. This registry keeps **one** `CityListingsClient` per slug
 * and hands it to every consumer, disposing it only when the last one unmounts.
 *
 * It is also **lazy**: the worker (and its big fetch) is created only while a
 * consumer passes `enabled` — i.e. once a filter goes non-default. At the
 * default view the cards read the server's pre-baked aggregates and no worker
 * exists.
 */
import { useEffect, useState } from "react";

import { CityListingsClient } from "@/lib/listings/client";

type Entry = { client: CityListingsClient; refs: number };

const registry = new Map<string, Entry>();

function acquire(slug: string): CityListingsClient {
  let entry = registry.get(slug);
  if (!entry) {
    entry = { client: new CityListingsClient(slug), refs: 0 };
    registry.set(slug, entry);
  }
  entry.refs += 1;
  return entry.client;
}

function release(slug: string): void {
  const entry = registry.get(slug);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    entry.client.dispose();
    registry.delete(slug);
  }
}

/**
 * Returns the shared listings client for `slug` while `enabled`, or `null`
 * otherwise (and when `enabled` flips back off, the consumer's ref is released —
 * disposing the worker once no consumer needs it).
 */
export function useCityListings(
  slug: string,
  { enabled }: { enabled: boolean },
): CityListingsClient | null {
  const [client, setClient] = useState<CityListingsClient | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const acquired = acquire(slug);
    // Synchronising an external resource (the shared worker registry) into
    // render state — the carve-out the rule's own message describes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClient(acquired);
    return () => release(slug);
  }, [slug, enabled]);

  // When disabled (or between slug changes) the released client must not leak
  // out, even though its state reference lingers until the next acquire.
  return enabled ? client : null;
}
