# UI Contract: Curated City Picker

## Landing Route `/`

**Purpose**: Present the curated launch city set and route users into a city market.

**Inputs**:

- Launch cities returned from `getCitiesData()`.

**Rendered content**:

- One selectable card per launch city.
- No cards beyond the launch data set.
- Each card displays a representative city image, city name, country, frame, formatted listing count, and snapshot label.
- The city image is decorative (`alt=""`); the card's accessible name carries the city identity.

**Interactions**:

- Pointer click on a card navigates to `/${slug}`.
- Keyboard Tab moves focus through every card.
- Enter on a focused card navigates to `/${slug}`.
- Space on a focused card navigates to `/${slug}`.
- Focused cards show a visible focus ring.

**Responsive behavior**:

- Desktop: cards appear as a multi-column grid.
- Tablet/mobile: cards reflow without hiding, duplicating, or truncating core city information.

**Accessibility contract**:

- Cards expose understandable accessible names.
- Focus order follows visual order.
- Motion is limited to token-based hover/focus transitions and must respect reduced-motion behavior.

## Dynamic City Route `/:city`

**Purpose**: Provide a valid destination for city selection.

**Inputs**:

- `city` route segment matching a launch city slug.

**Behavior**:

- Known launch slugs render a city route shell with the selected city identity.
- Unknown slugs return not found.
