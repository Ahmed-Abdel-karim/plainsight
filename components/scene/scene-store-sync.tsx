"use client";

/**
 * Seeds the scene store from the URL. The store decouples scene state from
 * `useSearchParams` (see `scene-store`), so it can't read the query reactively —
 * instead this reflects the URL into the store once per location, client-side:
 *
 *   - On mount (a deep-linked / refreshed `?lens=…&listing=…&nbhd=…&rooms=…&price=…`),
 *     so the scene restores to the shared link. The route's static shell paints the
 *     default view first, so a deep link with state settles in one frame after
 *     hydration — `<Activity>` keeps both lens subtrees mounted, so it's a cheap flip.
 *   - On `pathname` change (city navigation), so a fresh city starts from its own
 *     URL. `usePathname` is used deliberately (it doesn't trigger the
 *     `useSearchParams` dynamic bailout). Our own `replaceState` writes don't change
 *     the pathname, so they never re-seed (no echo).
 *
 * Renders nothing.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { loadScene } from "@/lib/search-params";
import { useSceneActions } from "./stores";

export function SceneStoreSync() {
  const pathname = usePathname();
  const { seed } = useSceneActions();

  useEffect(() => {
    const { lens, listing, nbhd, rooms, price } = loadScene(
      window.location.search,
    );
    seed({
      lens,
      selectedId: listing,
      nbhd,
      roomTypes: rooms,
      priceRange: price && price.length === 2 ? [price[0], price[1]] : null,
    });
  }, [pathname, seed]);

  return null;
}
