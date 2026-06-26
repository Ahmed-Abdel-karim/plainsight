Plainsight — Build Rules (AI implementation guide)

> **STALE PROTOTYPE-ERA GUIDE.** This old `docs/` file predates the current
> `_docs/` architecture refresh and contains obsolete state-management guidance.
> Use [`../_docs/architecture.md`](../_docs/architecture.md) for current
> architecture and [`../_docs/conventions.md`](../_docs/conventions.md) for
> current implementation conventions.

What this project is
A map-based rental-market explorer. Dark-first, dense, analytical (Observable/Datawrapper, not a consumer app). Next.js App Router + TypeScript. One map, two lenses (Browse = renter, Analyse = investor) switched by a toggle. The state-management notes in this prototype-era guide are obsolete; current scene state uses the XState actor system described in `_docs/architecture.md`.
The three inputs you are working from

tokens.css — the design system. Single source of truth for color, spacing, type, radius, map tokens. Never edit values to fix a styling problem; consume the tokens.
The design prototype (plainsight output: _.jsx, components.css, scene.css, screenshots) — the visual target only. It is hand-rolled HTML/CSS, NOT shadcn. Use it to know what things should look like, never copy its component implementation.
shadcn/ui (Mira style), already installed in components/ui/_ — the mandatory component layer.

Rule 1 — shadcn components are mandatory
Every interactive element MUST be an existing shadcn component from components/ui/. Do not hand-roll a button, menu, slider, dialog, tab, or toggle. If a shadcn component exists for it, use it.
Map the prototype's hand-rolled classes to shadcn components:
Prototype class / elementUse shadcn.btn, .icon-btnButton (variant, size).chip (room-type toggles)Toggle / ToggleGroup.city-trigger + .city-menuDropdownMenu or Select.tabs-trigger (Browse/Analyse)Tabsprice rangeSliderlisting detailDrawer (mobile) / Sheet or Dialog (desktop).kpi, .chart-card, .host-row panelsCard + compositiontext inputsInput + Label
Rule 2 — never fork a shadcn component
If a component needs to look or behave differently, change it via props and className (token utilities) only. Do NOT edit files in components/ui/. Do NOT copy a component out to re-style it. If a real gap exists (no prop covers it), compose a new component around the shadcn one — wrap, don't fork.
Rule 3 — token vocabulary only

Color: only bg-background bg-card bg-muted bg-secondary bg-primary, text-foreground text-muted-foreground, border-border. No raw hex/oklch in components.
Amber: fills use bg-primary. Amber-as-foreground (selected outline, focus ring, active icon/text) uses brand-emphasis (text-brand-emphasis / ring-brand-emphasis / border-brand-emphasis). Never raw amber.
Data hue ONLY on map/legend/charts: bg-price-1..5, cat-1..5. Never on chrome.
Spacing: p-_/gap-_ with tight snug inline stack gutter section region. No arbitrary values (p-[13px]).
Type: a type-\* class (type-display…type-metric). Never set font-size/font-weight directly. All prices and counts use type-metric (tabular mono).
Radius: rounded-md controls, rounded-lg cards, rounded-xl dialogs.

Rule 4 — density (Mira)
Controls 28px tall, 8px horizontal padding, 12px label text, 14px body. shadcn Mira defaults already deliver this — don't fight them. Exception: in the mobile bottom-sheet, interactive targets must be ≥44px tall (touch).
Rule 5 — responsive

Viewport breakpoints (lg:) ONLY for the top-level scene split (sidebar ↔ map; below ~1024px sidebar becomes a Drawer bottom-sheet).
Container queries (@container + @md:) for everything inside a panel/card/sheet — the same filter component serves both the desktop sidebar and the mobile sheet. No duplicate component, no isMobile prop.

Rule 6 — accessibility is acceptance, not polish
Dark default + working light toggle (both must pass). Full keyboard path to every action. Visible focus ring (brand-emphasis on dark). aria-live on the result count. Focus trap in the listing drawer. Respect prefers-reduced-motion. WCAG 2.1 AA contrast. Target axe-clean + a manual keyboard pass.
Rule 7 — theme switching contract
Theme is toggled by [confirm one and use it everywhere]: stock shadcn uses the .dark class on <html>. If tokens.css uses [data-theme], the ThemeProvider MUST write data-theme, or theming breaks silently. Pick one mechanism; do not mix.
Rule 8 — what to port vs rebuild from the prototype

Rebuild on shadcn: all chrome/controls (buttons, menus, tabs, slider, drawer, cards).
Port with light cleanup (no shadcn equivalent): the SVG choropleth map (map.jsx), charts (charts.jsx), the split-scene layout and map-chrome/scrim CSS (scene.css), and the data-color application logic. These are real, keep them.
Delete, do not port: design-canvas.jsx, tweaks-panel.jsx, ios-frame.jsx, the .html wrappers, .design-canvas.state.json — these are Claude Design's tooling, not the app.

Rule 9 — map chrome vs surfaces
Over-canvas controls (zoom, legend, theme toggle) float with the translucent --scrim + blur treatment (.map-chrome). The sidebar and listing drawer are solid bg-card. Translucency is for over-map controls only.
Definition of done (per screen)

Every control is a shadcn component (Rule 1–2). 2. Zero raw colors / arbitrary spacing / direct font-size (Rule 3). 3. Looks like the prototype at Mira density (Rule 4). 4. Keyboard + axe clean, both themes (Rule 6). 5. Works at desktop split and mobile sheet from one component (Rule 5).
