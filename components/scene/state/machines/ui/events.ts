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

/** City-switcher nav start. Transitions to navigating; clears selection + hover. */
export interface NavStart {
  readonly type: "NAV.START";
}

/** City actor converged. Transitions navigating → active. */
export interface CityReady {
  readonly type: "CITY.READY";
}

export type Events = Init | SetLens | Select | SetHover | NavStart | CityReady;
