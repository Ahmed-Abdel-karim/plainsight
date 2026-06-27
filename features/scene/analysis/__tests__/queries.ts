import { screen, within } from "@/test/render";

// Region-local custom queries — the recurring ways a user finds the analysis cards.

/** The skeleton's loading region, announced while the cold filtered path resolves. */
export const getLoadingStatus = () =>
  screen.getByRole("status", { busy: true });

/** The loading region, or `null` once the aggregates have rendered. */
export const queryLoadingStatus = () =>
  screen.queryByRole("status", { busy: true });

/** A chart card scoped by its heading, for asserting that card's own content. */
export const getChartCard = (name: RegExp | string): HTMLElement => {
  const section = screen.getByRole("heading", { name }).closest("section");
  if (!section) throw new Error(`no chart card for ${String(name)}`);
  return section as HTMLElement;
};

export { within };
