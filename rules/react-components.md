# React Components — Build Rules

## The three inputs you are working from

1. **`/app/tokens.css`** — the design system.
   - Single source of truth for color, spacing, type, radius, and map tokens.
   - Never edit values to fix a styling problem.
   - Consume the tokens.

2. **The design prototype**
   - located in `/agents`
   - Plainsight output: `*.jsx`, `components.css`, `scene.css`, screenshots.
   - The visual target only.
   - It is hand-rolled HTML/CSS, **not shadcn**.
   - Use it to know what things should look like.
   - Never copy its component implementation.

3. **`shadcn/ui` Mira style**
   - Already installed in `components/ui/*`.
   - This is the mandatory component layer.

## Rule 1 — shadcn components are mandatory

Every interactive element **must** be an existing shadcn component from `components/ui/`.

Do not hand-roll a button, menu, slider, dialog, tab, or toggle. If a shadcn component exists for it, use it.

Map the prototype's hand-rolled classes to shadcn components:

| Prototype class / element                 | Use shadcn                                          |
| ----------------------------------------- | --------------------------------------------------- |
| `.btn`, `.icon-btn`                       | `Button` with `variant` and `size`                  |
| `.chip` room-type toggles                 | `Toggle` / `ToggleGroup`                            |
| `.city-trigger` + `.city-menu`            | `DropdownMenu` or `Select`                          |
| `.tabs-trigger` Browse/Analyse            | `Tabs`                                              |
| Price range                               | `Slider`                                            |
| Listing detail                            | `Drawer` on mobile / `Sheet` or `Dialog` on desktop |
| `.kpi`, `.chart-card`, `.host-row` panels | `Card` + composition                                |
| Text inputs                               | `Input` + `Label`                                   |

## Rule 2 — never fork a shadcn component

If a component needs to look or behave differently, change it via props and `className` using token utilities only.

Do **not**:

- Edit files in `components/ui/`
- Copy a component out to re-style it
- Fork a shadcn component

If a real gap exists and no prop covers it, compose a new component around the shadcn one.

**Wrap, don't fork.**

## Rule 3 — token vocabulary only

### Color

Use only these chrome color tokens:

- `bg-background`
- `bg-card`
- `bg-muted`
- `bg-secondary`
- `bg-primary`
- `text-foreground`
- `text-muted-foreground`
- `border-border`

Do not use raw `hex` or `oklch` values in components.

### Amber

- Amber fills use `bg-primary`.
- Amber-as-foreground, such as selected outline, focus ring, and active icon/text, uses `brand-emphasis`.
- Use `text-brand-emphasis`, `ring-brand-emphasis`, or `border-brand-emphasis`.
- Never use raw amber.

### Data hue

Data hues are allowed **only** on:

- Map
- Legend
- Charts

Allowed data hue tokens:

- `bg-price-1` through `bg-price-5`
- `cat-1` through `cat-5`

Never use data hues on chrome.

### Spacing

Use tokenized spacing only:

- `p-*`
- `gap-*`
- `tight`
- `snug`
- `inline`
- `stack`
- `gutter`
- `section`
- `region`

Do not use arbitrary values such as `p-[13px]`.

### Type

Use a `type-*` class only, such as:

- `type-display`
- `type-metric`

Never set `font-size` or `font-weight` directly.

All prices and counts use `type-metric` with tabular mono styling.

### Radius

Use:

- `rounded-md` for controls
- `rounded-lg` for cards
- `rounded-xl` for dialogs

## Rule 4 — density: Mira

Controls should be:

- `28px` tall
- `8px` horizontal padding
- `12px` label text
- `14px` body text

shadcn Mira defaults already deliver this. Do not fight them.

Exception: in the mobile bottom-sheet, interactive targets must be at least `44px` tall for touch.

## Rule 5 — responsive

Use viewport breakpoints, such as `lg:`, **only** for the top-level scene split:

- Desktop: sidebar + map
- Below approximately `1024px`: sidebar becomes a drawer bottom-sheet

Use container queries for everything inside a panel, card, or sheet:

- `@container`
- `@md:`

The same filter component must serve both the desktop sidebar and the mobile sheet.

Do **not** create:

- Duplicate components
- `isMobile` props

## Rule 6 — accessibility is acceptance, not polish

Accessibility is part of the acceptance criteria.

Requirements:

- Dark default and working light toggle
- Both themes must pass
- Full keyboard path to every action
- Visible focus ring using `brand-emphasis` on dark
- `aria-live` on the result count
- Focus trap in the listing drawer
- Respect `prefers-reduced-motion`
- WCAG 2.1 AA contrast
- Target axe-clean
- Manual keyboard pass

## Rule 7 — theme switching contract

Theme is toggled by one mechanism only.

Use one of these and apply it everywhere:

- Stock shadcn: `.dark` class on `<html>`
- If `tokens.css` uses `[data-theme]`, then `ThemeProvider` must write `data-theme`

Do not mix mechanisms.

Mixing `.dark` and `[data-theme]` can silently break theming.

## Rule 8 — what to port vs rebuild from the prototype

### Rebuild on shadcn

Rebuild all chrome and controls on shadcn:

- Buttons
- Menus
- Tabs
- Slider
- Drawer
- Cards

### Port with light cleanup

Port these because there is no direct shadcn equivalent:

- SVG choropleth map: `map.jsx`
- Charts: `charts.jsx`
- Split-scene layout
- Map chrome / scrim CSS: `scene.css`
- Data-color application logic

These are real app pieces. Keep them.

### Delete, do not port

Delete Claude Design tooling files:

- `design-canvas.jsx`
- `tweaks-panel.jsx`
- `ios-frame.jsx`
- `.html` wrappers
- `.design-canvas.state.json`

These are not part of the app.

## Rule 9 — map chrome vs surfaces

Over-canvas controls, such as zoom, legend, and theme toggle, float with the translucent `--scrim` + blur treatment using `.map-chrome`.

The sidebar and listing drawer are solid `bg-card`.

Translucency is for over-map controls only.

## Definition of done per screen

A screen is done when:

1. Every control is a shadcn component.
2. There are zero raw colors, arbitrary spacing values, or direct font-size declarations.
3. The screen looks like the prototype at Mira density.
4. Keyboard navigation is clean.
5. axe checks are clean.
6. Both dark and light themes work.
7. The screen works at desktop split and mobile sheet sizes.
8. The same component is used for desktop and mobile where applicable.
