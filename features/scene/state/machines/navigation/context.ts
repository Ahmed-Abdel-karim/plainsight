export interface Context {
  readonly currentPath: string | null;
  readonly pendingPath: string | null;
}

export const Context: Context = {
  currentPath: null,
  pendingPath: null,
};
