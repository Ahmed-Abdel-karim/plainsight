/**
 * Map machine actions.
 *
 * DRAFT NOTE: the map's actions are currently defined inline in `machine.ts`'s
 * `setup({ actions })`, because they split into two kinds — pure `assign`
 * updates and side-effecting imperative MapLibre calls — which don't all fit the
 * "return `Partial<Context>`" convention. During refinement we decide whether to
 * extract them here (e.g. the `assign` ones) or keep them inline.
 */
export {};
