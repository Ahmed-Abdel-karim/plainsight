"use client";

/**
 * Write side of the URL sync. Observes the projected scene selection — `lens` +
 * `selectedId` from `ui`, room/price/nbhd from `city` — and pings the root
 * machine with `URL.SYNC` whenever any of it changes. The root decides *whether*
 * to mirror: it writes only in `settled` and drops the signal while `switching`,
 * so a city switch's intermediate clears never clobber the URL. The actual
 * `replaceState` projection lives in the root's `syncUrl`
 * action, which reads live actor snapshots — so there is no stale-closure write.
 * The read side (URL → state seeding) lives in `SceneUrlLoader`.
 */
import { useEffect } from "react";

import {
  useLens,
  useNbhd,
  usePriceRange,
  useRoomTypes,
  useRootSend,
  useSelectedId,
} from "./state";

export function UrlWriteSync() {
  const rootSend = useRootSend();
  const lens = useLens();
  const selectedId = useSelectedId();
  const roomTypes = useRoomTypes();
  const priceRange = usePriceRange();
  const nbhd = useNbhd();

  useEffect(() => {
    rootSend({ type: "URL.SYNC" });
  }, [rootSend, lens, selectedId, roomTypes, priceRange, nbhd]);

  return null;
}
