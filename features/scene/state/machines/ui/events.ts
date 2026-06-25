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

export type Events = Init | SetLens | Select | SetHover | Suspend | Resume;
