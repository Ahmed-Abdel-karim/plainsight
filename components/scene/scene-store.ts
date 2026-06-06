"use client";

/**
 * The whole scene's URL-backed state — lens, the open listing, neighbourhood
 * scope, and the room/price filters — in one client store. This used to be split
 * across three nuqs hooks (`use-lens`, `use-scope`, `use-filters`), but every
 * nuqs hook reads `useSearchParams()`, which under `cacheComponents` is a dynamic
 * API: each consumer became its own Suspense/dynamic hole, and the route had to
 * render dynamically (an `await searchParams` in `LensTabs`) just to keep those
 * reads SSR-correct. None of that state actually needs the server — it's client
 * UI state — so holding it here decouples reactivity (the store) from URL
 * persistence (a `replaceState` side-effect), and the route renders fully static.
 *
 * Module-global (like the map store) rather than a per-request factory: the store
 * is *only ever seeded on the client* (`SceneStoreSync` reads `location.search`),
 * never from the server request, so there's no cross-request SSR bleed — the
 * server always renders the default view into the static shell, and the client
 * reflects the deep-linked URL in after hydration.
 *
 * The URL stays the shareable projection: every mutating action re-serializes the
 * full state into the query (merging via `serializeScene(location.search, …)`, so
 * stray params survive) and writes it with `history.replaceState`. `priceRange`
 * is held nullable (`null` = full range, mirroring an absent `price`); the rest
 * map 1:1 to their params, with defaults dropped from the URL.
 */
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { ROOM_TYPES, type RoomType } from "@/data/contract";
import { syncSceneUrl, type Lens } from "@/lib/search-params";
import { subscribeWithSelector } from "zustand/middleware";

interface State {
  // Filters
  /** Selected room types; `[]` means "all" (the no-filter state). */
  roomTypes: RoomType[];
  /** `[min, max]` price selection, or `null` for the full (default) range. */
  priceRange: [number, number] | null;
  // Structural
  lens: Lens;
  /** The open listing's id, or `null` when no detail drawer is open. */
  selectedId: number | null;
  /** The scoped neighbourhood id, or `null` for the city-wide scope. */
  nbhd: string | null;
}

interface Actions {
  /** Reflect the URL into the store (no write-back). Client-only. */
  seed: (next: State) => void;
  setRoomTypes: (roomTypes: RoomType[]) => void;
  /** `null` = back to the full range (the caller decides via the city bounds). */
  setPriceRange: (priceRange: [number, number] | null) => void;
  reset: () => void;
  setLens: (lens: Lens) => void;
  selectListing: (id: number | null) => void;
  setNeighbourhood: (id: string | null) => void;
  toggleNeighbourhood: (id: string) => void;
}

export const useSceneStore = create<State & { actions: Actions }>()(
  subscribeWithSelector((set, get) => ({
    roomTypes: [],
    priceRange: null,
    lens: "analyse",
    selectedId: null,
    nbhd: null,
    actions: {
      seed: (next) => set(next),
      setRoomTypes: (roomTypes) => {
        const normalised =
          roomTypes.length === ROOM_TYPES.length ? [] : roomTypes;
        set({ roomTypes: normalised });
      },
      setPriceRange: (priceRange) => {
        set({ priceRange });
      },
      reset: () => {
        set({ roomTypes: [], priceRange: null });
      },
      setLens: (lens) => {
        set(lens === "analyse" ? { lens, selectedId: null } : { lens });
      },
      selectListing: (selectedId) => {
        set({ selectedId });
      },
      setNeighbourhood: (nbhd) => {
        set({ nbhd });
      },
      toggleNeighbourhood: (id) => {
        set({ nbhd: get().nbhd === id ? null : id });
      },
    },
  })),
);

export const useSceneActions = () => useSceneStore((state) => state.actions);
export const useRoomTypes = () => useSceneStore((state) => state.roomTypes);
export const usePriceRange = () =>
  useSceneStore(useShallow((state) => state.priceRange));
export const useLensValue = () => useSceneStore((state) => state.lens);
export const useSelectedId = () => useSceneStore((state) => state.selectedId);
export const useNbhd = () => useSceneStore((state) => state.nbhd);

// Subscriptions
useSceneStore.subscribe((state) => state, syncSceneUrl);
