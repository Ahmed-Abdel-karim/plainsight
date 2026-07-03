import type { Lens } from "@/lib/search-params";

import type * as Input from "./input";

/** Auto-fired when the actor starts; carries the machine `input`. */
export interface Init {
  readonly type: "xstate.init";
  readonly input: Input.Input;
}

export interface SetLens {
  readonly type: "UI.SET_LENS";
  readonly lens: Lens;
}

/** Authoritative lens sync from the URL (cold load, a forward city switch whose
 *  link carries the lens, or a Back/Forward restore). Unlike UI.SET_LENS (user
 *  interaction) it is honored in every state — the URL is the source of truth for
 *  the destination lens, which is navigation state, not stale interaction. */
export interface SyncLens {
  readonly type: "UI.SYNC_LENS";
  readonly lens: Lens;
}

export interface Select {
  readonly type: "UI.SELECT";
  readonly id: number | null;
}

export interface SetHover {
  readonly type: "UI.SET_HOVER";
  readonly id: number | null;
  readonly source: "list" | "map";
}

/** Suppression pair (shared with map). `SUSPEND` → navigating (clears
 *  selection + hover); `RESUME` → active. */
export interface Suspend {
  readonly type: "SUSPEND";
}
export interface Resume {
  readonly type: "RESUME";
}

/** Scene-session reset, fanned from root when navigation leaves `/city`. Returns
 *  to `active` and clears selection + hover. */
export interface SceneReset {
  readonly type: "SCENE.RESET";
}

export type Events =
  | Init
  | SetLens
  | SyncLens
  | Select
  | SetHover
  | Suspend
  | Resume
  | SceneReset;
