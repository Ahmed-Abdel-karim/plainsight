# UI Contract: City Establishes the Default Analysis Scope

## Supported City Route `/:city`

**Purpose**: Present the city-scoped scene with the whole city as the default analysis scope.

**Inputs**:

- `city` route segment matching a supported city slug.
- City dataset from `getCityDataset(city)` (non-null for supported slugs).
- Default scope `{ type: "city" }` and its aggregates from `selectScopeAggregates(dataset, scope)`.

**Rendered content**:

- A scene composed of a map region and a sidebar region, both presented against city scope.
- The map region is a non-interactive placeholder shell (interactive map deferred to a later epic); it is never blank/absent.
- The sidebar region hosts the scope label and clearly-marked slots for deferred analytics.
- A scope label showing the city name and the city's total listing count, formatted with digit grouping (e.g. `London · 61,963 listings`).

**State**:

- Active analysis scope = whole city, with no narrowing.
- All scope-dependent content describes the whole city.

**Interactions**:

- This story has no scope-changing interactions; the scene presents the city-wide baseline.

**Responsive behavior**:

- Desktop: map region and sidebar region laid out together (e.g. side-by-side) without overlap.
- Tablet/mobile: regions reflow without hiding the scope label or either region.

**Accessibility contract**:

- The scope label uses `role="status"` / `aria-live="polite"` so a future scope change is announced; the listing count reads as understandable text.
- Dark and light themes preserve readability and WCAG 2.1 AA contrast.
- Motion is limited to token-based transitions and respects reduced-motion.

## Not-Found View `app/[city]/not-found.tsx`

**Purpose**: Handle an unknown/unsupported city slug gracefully and route the user back to the picker.

**Trigger**:

- The city page calls `notFound()` when `getCityDataset(city)` returns `null`.

**Rendered content**:

- A graceful not-found message (no crash, no raw error, no blank map).
- A clearly labelled back-to-picker action linking to `/`.

**Behavior**:

- Renders none of the city scene regions and no other city's scoped content.
- Activating the back-to-picker action lands the user on the picker at `/`.

**Interactions**:

- Pointer click on the back-to-picker action navigates to `/`.
- Keyboard Tab reaches the action; Enter activates it.

**Accessibility contract**:

- The back-to-picker action is a real link/button (shadcn `Button` `asChild` + `Link`) with a visible focus ring.
- Focus order follows visual order; the action has an understandable accessible name.
- Dark and light themes preserve readability and WCAG 2.1 AA contrast.
