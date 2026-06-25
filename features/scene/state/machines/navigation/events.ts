export interface NavIntent {
  readonly type: "NAV.INTENT";
  readonly path: string;
}

export interface NavCommit {
  readonly type: "NAV.COMMIT";
  readonly path: string;
}

export type Events = NavIntent | NavCommit;

export interface NavStarted {
  readonly type: "NAV.STARTED";
  readonly path: string;
}

export interface NavEnded {
  readonly type: "NAV.ENDED";
  readonly path: string;
}

export type Emitted = NavStarted | NavEnded;
