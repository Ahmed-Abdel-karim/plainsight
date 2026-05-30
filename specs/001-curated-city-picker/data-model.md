# Data Model: Curated City Picker

## Launch City

Represents one entry in the curated launch set.

**Source**: `data/json/cities.json`

**Fields**:

- `slug`: stable route segment used for `/${slug}`
- `name`: display city name
- `country`: display country name
- `countryFlag`: display flag marker
- `frame`: short market classification shown on the card
- `tone`: descriptive market summary shown on the card
- `snapshotLabel`: dated snapshot label shown with the listing count
- `listingCount`: numeric count formatted for display

**Validation rules**:

- `slug` must be non-empty and unique within the launch set.
- `slug` must be used directly for routing; do not derive a separate route value from `name`.
- The rendered launch set must contain exactly the entries returned by the loader.

## City Card

Represents one selectable city option on the landing page.

**Fields derived from Launch City**:

- `href`: `/${slug}`
- `accessibleName`: city name, country, frame, listing count, and snapshot label
- visible card content: name, country, frame, tone, listing count, snapshot label

**State**:

- Default
- Hover
- Keyboard focus
- Active selection via Enter or Space

**Validation rules**:

- The card must be focusable in normal tab order.
- Enter and Space must activate the same route target.
- The focus state must be visible in dark and light themes.

## City Route

Represents the destination page for a launch city slug.

**Fields**:

- `city`: route param matching a Launch City `slug`
- `dataset`: full city dataset loaded by slug when present

**Validation rules**:

- Launch city slugs resolve to a valid route.
- Unknown slugs return a not-found state.
