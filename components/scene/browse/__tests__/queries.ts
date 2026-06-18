import { screen, within } from "@/test/render";

// Region-local custom queries — the recurring ways a user finds the browse surfaces.

// Matched by text: the `status` role takes no accessible name from its content.
export const getLoadingIndicator = () => screen.getByText(/loading listings/i);

/** The loading status, or `null` once it has cleared. */
export const queryLoadingIndicator = () =>
  screen.queryByText(/loading listings/i);

/** The polite live region announcing the matching set ("N of total listings"). */
export const getBrowseCount = () => screen.getByRole("status");

/** The listings list, once it has rendered from the points tier. */
export const findListingList = () =>
  screen.findByRole("list", { name: /listings matching/i });

/** The list, or `null` while loading / empty (no `findBy` wait). */
export const queryListingList = () =>
  screen.queryByRole("list", { name: /listings matching/i });

/** A listing row (a button) by its accessible name, awaiting render. */
export const findListingButton = (name: RegExp | string) =>
  screen.findByRole("button", { name });

/** The Sort control trigger. */
export const getSortControl = () =>
  screen.getByRole("combobox", { name: "Sort" });

/** The detail drawer dialog, once a listing is selected. */
export const findDetailDrawer = () => screen.findByRole("dialog");

export { within };
