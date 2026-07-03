export interface NavIntent {
  readonly type: "NAV.INTENT";
  readonly path: string;
}

export interface NavCommit {
  readonly type: "NAV.COMMIT";
  readonly path: string;
}

/** Scene-session reset, fanned from root when navigation leaves `/city` (the
 *  Activity-hide recovery). Returns the machine to its initial resting state. */
export interface SceneReset {
  readonly type: "SCENE.RESET";
}

export type Events = NavIntent | NavCommit | SceneReset;

export interface NavStarted {
  readonly type: "NAV.STARTED";
  readonly path: string;
}

export interface NavEnded {
  readonly type: "NAV.ENDED";
  readonly path: string;
}

export type Emitted = NavStarted | NavEnded;
