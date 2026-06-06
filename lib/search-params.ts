/**
 * Shared scene URL param schema — the single source of truth for every search
 * param that drives the scene (lens, selected listing, neighbourhood scope, and
 * the room/price filters).
 *
 * The live state lives in the scene store (`components/scene/scene-store`); these
 * parsers are only its (de)serialization layer. They come from `nuqs/server`, so
 * they're pure functions with no React and no `useSearchParams` — reading or
 * writing the URL through them never forces a `cacheComponents` dynamic bailout,
 * which is the whole reason the scene state moved off the nuqs client hooks. The
 * route renders fully static; the store reflects the URL in on the client
 * (`loadScene(location.search)`) and writes it back with `history.replaceState`
 * (`serializeScene`). `clearOnDefault` keeps the URL clean at the default view
 * (analyse lens, no listing, city scope, all rooms, full price range).
 */
import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { ROOM_TYPES, type RoomType } from "@/data/contract";
import type { Scope } from "@/data/types";

export type Lens = "analyse" | "browse";

export const LENSES = ["analyse", "browse"] as const;

/**
 * Structural scene params: which lens is active, the open listing's id, and the
 * neighbourhood scope. `lens` defaults to `analyse` (dropped from the URL there);
 * `listing`/`nbhd` are absent when unset.
 */
export const sceneParams = {
  lens: parseAsStringLiteral(LENSES).withDefault("analyse"),
  listing: parseAsInteger,
  nbhd: parseAsString,
};

/**
 * Filter params — room types + price range. `rooms` defaults to `[]` ("all
 * rooms"); `price` has no default because its bounds are per-city, so the absent
 * param means "full range" and `use-filters` resolves it against the city bounds.
 */
export const filterParams = {
  rooms: parseAsArrayOf(parseAsStringLiteral(ROOM_TYPES)).withDefault([]),
  price: parseAsArrayOf(parseAsInteger),
};

/** Every scene search param, keyed the same as the store state. */
export const sceneSearchParams = {
  ...sceneParams,
  ...filterParams,
};

/**
 * Reflect the URL into the store (on first render / city navigation) and back
 * out of it. `serializeScene` is always called with the current `location.search`
 * as its base, so it merges — any param it doesn't own is preserved — and `null`
 * / default values drop their key (`clearOnDefault`).
 */
export const loadScene = createLoader(sceneSearchParams);
export const serializeScene = createSerializer(sceneSearchParams);

/** Derive the analysis `Scope` from the `nbhd` param (absent = city-wide). */
export function scopeFromNbhd(nbhd: string | null): Scope {
  return nbhd ? { type: "neighbourhood", id: nbhd } : { type: "city" };
}

/** The scene state projected onto the URL — the store's URL-backed slice. */
export interface SceneUrlState {
  roomTypes: RoomType[];
  priceRange: [number, number] | null;
  lens: Lens;
  selectedId: number | null;
  nbhd: string | null;
}

/** Mirror the full scene selection to the URL, preserving any unrelated params. */
export function syncSceneUrl(state: SceneUrlState): void {
  if (typeof window === "undefined") return;
  const search = serializeScene(window.location.search, {
    // Defaults drop their key (clearOnDefault), keeping the URL clean: `[]` rooms,
    // `null` price, `analyse` lens, `null` listing/nbhd all serialize to nothing.
    rooms: state.roomTypes,
    price: state.priceRange,
    lens: state.lens,
    listing: state.selectedId,
    nbhd: state.nbhd,
  });
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${search}`,
  );
}
