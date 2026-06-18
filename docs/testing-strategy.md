Plainsight — Testing strategy (living decisions doc)

> **Status:** Working decisions log, not the final ADR. We resolve one principle
> at a time and record the settled rule here so we never re-derive it. This file
> is the raw material that the polished architecture/decision docs (the portfolio
> deliverable) will later be built from. **Update it as each new decision lands.**
> Where this and shipped code disagree, the code wins and this note gets fixed.

---

## Philosophy (the frame everything else hangs on)

Guillermo Rauch / Kent C. Dodds: **"Write tests. Not too many. Mostly
integration."** We adopt the **Testing Trophy** (static → unit → **integration**
→ E2E), not the pyramid. Integration is the centre of gravity because it is the
best trade between **confidence and cost**.

Two rules we hold as hard constraints:

1. **Stop mocking so much.** Every mock subtracts confidence. A mock is justified
   only when the boundary is genuinely outside our control or unrenderable in the
   test environment — never for convenience.
2. **No coverage target.** Goal-driven tests only ("no goalless tests"). Past
   ~70% you start pinning implementation detail and taxing refactors. Each test
   must state the contract it protects.

**Grounding sources (for the eventual write-up):**

- Kent C. Dodds — _Write tests. Not too many. Mostly integration._
  (https://kentcdodds.com/blog/write-tests) — the trophy, the mocking warning,
  the coverage ceiling.
- Aurora Scharff (Vercel DX) — testing RSC with Vitest + RTL in the App Router
  (https://aurorascharff.no/posts/running-tests-with-rtl-and-vitest-on-internationalized-react-server-components-in-nextjs-app-router/)
  — `<Suspense>` + async `findBy*`, mock the framework-server seam, and the
  explicit "this is not officially supported" caveat (pragmatism over dogma).
- XState v5 docs — `createActor().start()` → `send()` → assert
  `getSnapshot().value`/`.context`; inject mock `actors`/`actions` at `setup()`;
  `createTestModel` for model-based path coverage. No DOM, no WebGL needed.
- Next.js docs — Vitest + RTL is the official unit/integration path; **async
  Server Components are not yet supported by Vitest** → E2E for those.
- Nadia Makarevich (_Advanced React_) — testable component architecture: explicit
  data-in / callbacks-out seams give the wide integration net clean injection
  points. (Feeds the clean-code workstream more than this one.)

---

## Why this strategy — the rationale (deliverable narrative)

> This is the _human_ reasoning behind the architecture — lived experience, not a
> rule copied from a blog. Use it as the "why" when writing the final docs.

This strategy is a deliberate response to a failure mode I have lived: **flaky,
slow end-to-end suites.** On real pipelines, E2E runs stretch to tens of minutes
or hours once retry rules kick in — and worse than the wall-clock cost, they
produce **false reds: a failed build with no real bug behind it.**

The deeper damage isn't the wasted CI minutes — it's **trust.** A suite that
cries wolf gets ignored. Once "red" stops reliably meaning "stop," the safety net
is gone even while it's still running; people merge through it, rerun until green,
or quietly disable it. A test you don't trust is worse than no test, because it
costs time _and_ gives false comfort.

So the whole architecture follows one rule: **put each check at the cheapest, most
deterministic layer that can still give the confidence.**

- **Integration is the centre of gravity** because it is fast, in-memory, and
  deterministic — no network, no GPU, no real browser — yet it exercises the real
  components and the real state machine together. Maximum confidence per second of
  CI, with almost nothing left to flake.
- **E2E is rationed** to the few things only a real browser can prove (Principle
  3's short list) — and even those are made **deterministic on purpose**: MapGrab
  asserts map _state_ instead of pixel-diffing a canvas, software WebGL keeps it on
  stock runners, Chromium-only avoids cross-browser rendering divergence. The
  entire E2E design is shaped to **refuse the flake-and-retry tax**, not to invite
  it.
- **The mocks at the un-renderable edges** (Principle 2) exist for the same
  reason: they pull confidence _down_ from a slow, flaky browser layer into a fast,
  deterministic one — with E2E kept as the thin backstop that proves the mock
  didn't drift.

In short: every layer choice here optimises for a suite that is **fast and
trustworthy**, because a test suite only protects you for as long as people
believe its red.

---

## Principle 1 — Boundary distribution (SETTLED)

The trophy, mapped onto Plainsight's actual layers (RSC + XState + MapLibre
WebGL + analytics worker).

### The escalation ladder

1. **Integration (widest — the centre of gravity).** Real XState actor system
   wired together (root + map + city + ui + worker) and real components, mocking
   only the true externals:
   - **MSW** for the route handlers / `data/loaders` returning the static
     per-city tiers.
   - **The analytics worker** stubbed (jsdom has no real Worker thread) — inject
     a fake worker actor.
   - **MapLibre WebGL** mocked at the render boundary (see Principle 2).

2. **Unit (in isolation).** Only what integration can't _cleanly reach or
   provoke_:
   - Pure kernels: `lib/filters/sort`, `lib/hex`, `lib/listings/compute`,
     `lib/geo/utils`, etc.
   - Individual machine edge cases painful to drive through the full UI: rapid
     city-switch races, `suppressed → interactive` timing.
   - "All machines connected first, drill to the smallest unit only if required."

3. **E2E (narrowest — earns its place).** Only what is **genuinely
   browser-only**: WebGL paint, real pointer hit-testing on the map, deep-link
   restore visuals, theme swap of the basemap. _(Scope + CI strategy: OPEN —
   next discussion.)_

### Discipline rule for E2E

E2E _can_ test anything, which is exactly why it metastasises. The rule is the
inverse: **a behaviour earns an E2E test only when no cheaper layer can give the
confidence.** For Plainsight that filter leaves a very short list (the map
actually paints; a pointer actually filters the hex layer).

### Key insight — gating is testable without WebGL

Because transition gating was _designed into the `map` machine_
(`docs/map-machine-transition-gating.md`), the gate is verifiable with **no
WebGL**: "pointer suppressed during city transition" is an assertion on
`getSnapshot().value`, not a click on a canvas. The thing that _looks_ like it
needs E2E doesn't. This inverts the usual WebGL-testing pain and is a headline
portfolio point.

### Canonical integration subject

Both tiers, with the **state-layer** as the headline:

- **(A) State-layer integration** — actor system connected, driven by events,
  asserted on snapshots, MSW for data, no React render. Fast, CI-stable, and it
  showcases the architecture directly. This is "all machines connected"
  literally.
- **(B) UI-layer integration** — render the scene island (RTL) with real actors
  underneath, MSW for data, WebGL/worker mocked per Principle 2, assert on
  role/name queries. Wraps the parts of the tree that _do_ render in jsdom
  (browse lens, panels, headers) around the real machines.

Principle 2's render-boundary mock is what makes (B) viable despite the WebGL
wall.

---

## Principle 2 — Mocking unrenderable deps in integration tests (SETTLED)

Draw the mock at the **render boundary of the unrenderable dependency**, split by
interaction type. You are **not testing MapLibre — you are testing your contract
with MapLibre.** The actual paint is trusted and lives in E2E.

- **Declarative side.** Mock `react-map-gl`'s `<Source>`/`<Layer>`/`<Marker>` as
  plain `<div>`s that re-emit their meaningful data as `data-*` / `testid`
  attributes. RTL then asserts _"a hex layer for these features exists,"_ "a
  circle layer with this filter exists" — i.e. assert **the data your code handed
  the map**, as a proxy for "the map rendered it."
- **Imperative side.** Mock the `mapRef` / map instance as a class with spied
  methods (`setFeatureState`, `getMap`, event handlers); assert the **call
  shape** — e.g. `setFeatureState` called with feature X / state `{ hover: true }`
  on the hover event.

### The three guardrails (so the mock doesn't quietly lie)

1. **Mock at the lowest seam, thinly.** Stub only the `react-map-gl` module
   boundary. Everything above stays real: layer components, the machine→props
   data flow, the hover→`setFeatureState` wiring. The mock replaces _the library_,
   never _your code_. Failure mode: mocking too high stubs out your own logic and
   the test proves nothing.
2. **Keep the mock faithful and centralised.** One definition (`__mocks__` / a
   test helper) matching the **real API signatures** and event-object shapes.
   Assert on a **meaningful signal** (feature count, layer id, filter expression,
   hovered id) — never a full serialised GeoJSON blob in a DOM attribute. Accept
   that a hand-rolled mock can drift from reality, so **E2E is the drift
   backstop**: integration proves "we sent the right thing," E2E proves "the
   library does the right thing with it."
3. **Official method first, mock only as fallback.** If the dependency has a
   documented test path, use it. Recharts is the live example: it needs a sized
   container in jsdom (zero-size → renders nothing); reach for its known guidance
   before a full mock. When you do fall back to a render-boundary mock, note
   in-code that it is a deliberate workaround (Aurora's pragmatism rule).

---

## Principle 3 — E2E layer (SETTLED)

**A minimal Playwright suite, MapGrab, option A** (deterministic map-state
assertions, no pixel diffing). E2E proves _behaviour in a real browser_, not
pixels.

### What earns a browser test (the short list)

Only what no cheaper layer can cover — the things the Principle-2 mocks fake or
that need a real WebGL context. ~4 happy-path flows, one per concern, not a
matrix:

1. **The map initializes in a real browser** — `loading → ready` with an actual
   WebGL context (jsdom can't).
2. **A real pointer on the canvas filters/selects** — hex inspect, listing
   select, hover. This is the **drift backstop** for the Principle-2 imperative
   mock: integration proved "we called `setFeatureState` correctly," E2E proves
   "a real click actually hits the feature."
3. **Cold deep-link restore** — load `/[city]?…filters…` fresh; map + browse
   reflect it.
4. **Theme swap of the basemap in place.**

Anything provable on a snapshot stays in the state-layer integration tier.

### Why option A (MapGrab, no pixel diff)

WebGL-in-CI reality: software WebGL (SwiftShader) headless is flaky (canvas
timeouts, readiness races), Firefox has no headless WebGL, and the "stable" fix
(headed + `xvfb` + GPU runner) adds infra, is slower, and _still_ diverges on
screenshots cross-platform.

[MapGrab](https://falseinput.com/testing-maplibre-gl-js-applications-with-mapgrab-and-playwright)
sidesteps this: instrument the map once (`installMapGrab(map, 'mainMap')`), then
assert map **state** deterministically — `waitToMapLoaded()`,
`expect(marker).toBeVisibleOnMap()`, query features, assert center/bbox — with no
pixel diffing. It owns readiness and we skip screenshots, killing the two main
flake sources. Runs on stock GitHub Actions Ubuntu, **Chromium-only** (Firefox
ruled out by its lack of headless WebGL).

### Division of labour (no overlap)

- **E2E (Playwright + MapGrab)** = deterministic _behaviour_ in CI.
- **`run-app` skill** = curated dark/light/mobile _visuals_ for the README
  (manual). Visual regression of the basemap is explicitly **not** an E2E goal.

### Decisions recorded

- **App-init instrumentation accepted.** MapGrab is a test-only dependency that
  touches map initialisation; it must be **gated behind a test/env flag** so it
  is absent in production. This is test infra, not a feature (does not violate
  the feature freeze), but it is a deliberate "modified app init for testability"
  decision.
- **CI stability levers** (from the MapGrab guidance): pin the base-map style
  version, use `exposeLayers()` to drop layers the test doesn't need, prefer
  fixed/offline styles to kill network flake, Docker only if platform rendering
  diverges.
- **Model-based testing (`createTestModel`) is out of the core suite** — the
  machine→DOM mapping is laborious and the machines are already tested directly
  via `createActor`. Keep as a one-line "future enhancement / showcase" idea,
  not load-bearing.

---

## Principle 4 — Backfill ordering & the machine story (SETTLED)

**Machines first** (biggest gap + headline architecture), but the priority _shape_
is user-story-led:

1. **Primary — user-story integration tests.** A test acts as a user (click a
   city, open browse, hover the map) with the **real machine running
   underneath**. The machine is exercised _through_ the UI, not asserted
   separately. This is the wide net and the main body of the suite.
2. **Secondary — machine-in-isolation tests for coverage.** Situations hard to
   trigger by clicking (rapid city switches, suppressed→interactive timing,
   error paths) are driven directly against the machine via `createActor` to
   close the corners.
3. **Kernel anchor.** Pin the few pure kernels on the machine's data path
   (`lib/listings/compute`, worker processes, `lib/filters/sort`) first, so
   machine tests never assert output against an unverified calculation. Remaining
   standalone kernels follow as gaps demand.

### The transition-gating spec file

The gating rule (map ignores pointer interaction while a city load is in flight)
gets its **own dedicated, story-like test file** sitting beside
`docs/map-machine-transition-gating.md` — an **executable spec** whose cases read
as plain statements ("while loading, a click does nothing"). The design doc and
its proof sit side by side: the explicit "designed, then verified" (not
vibe-coded) signal.

---

## Principle 5 — No coverage target; enforce quality in layers (SETTLED)

**No coverage target.** Coverage % can be high while tests assert nothing useful,
and chasing it produces goalless tests — the opposite of the rule. We stay
**feature / real-user-behaviour oriented, not code-oriented.** Coverage reports
are allowed as a **flashlight to find gaps**, never as a pass/fail build gate.

Since "is this test meaningful?" is a judgment call no tool can fully prove, the
rule is enforced in **layers** (bad tests must clear all of them):

1. **Written rule (the law)** — this doc: every test states its goal; test
   user-visible behaviour, not internals.
2. **ESLint test plugins (mechanical, hard gate)** — `eslint-plugin-testing-library`
   - `eslint-plugin-vitest` fail the build on the tell-tale signs of bad tests
     (prefer role/label queries over hidden test-ids; ban stray `test.only`, etc.).
     Blocks the mechanical junk automatically.
3. **AI PR reviewer (judgment, advisory) — CONDITIONAL.** The
   [Claude Code GitHub Action](https://code.claude.com/docs/en/github-actions)
   runs on each PR, follows this doc / `CLAUDE.md` as its review instructions, and
   **comments** on tests that look goalless or implementation-focused (does not
   block). Doubles as a portfolio artifact ("AI reviews my PRs against rules I
   wrote"). **Adopt only if a free tier covers it** — otherwise skip, no loss.
   Decision deferred to **Workstream 4 (CI/CD)**.
4. **Human reviewer** — final call, using the AI's comments as input.

Division of labour: layer 2 hard-blocks mechanical mistakes; layers 3–4 catch the
"is this a real test?" question with judgment. The AI layer is advisory and not
perfectly consistent — it sits _beside_ the human, never instead.

---

## Principle 6 — Sequencing: behaviour-net before refactor (SETTLED)

Reverses the old Workstream 2↔3 order. Write the **behaviour tests first**, then
refactor under the net — because we already committed to behaviour/user-story
tests (Principles 1 & 4), so the net **survives** internal refactoring instead of
churning with it. Writing the test is also the truest pressure-test of the design:
if something is painful to test, that pain _is_ the design smell, and it points to
where the refactor should happen.

This works **only because** the tests are behaviour-oriented. An
implementation-coupled test written first would churn under the refactor and
recreate the rework the old order was avoiding — so "tests first" and
"behaviour-only tests" are one decision, not two.

**Decision rule (not a blanket order):**

1. **Stable-contract code** (messy inside, settled behaviour) → behaviour tests
   first, then refactor freely under the net. Most of the app.
2. **Code already known to change shape/contract** → refactor that first (small),
   _then_ test the new shape. Don't test a corpse.
3. **Testability seams hit while writing tests** → fix surgically as they surface,
   and note them. These are the small "the test forced a code change" moments —
   adding an injection point or boundary, not the broad clean-code pass — and you
   _want_ them discovered before the refactor.

Practical sequence: **behaviour net first → clean-code refactor under the net →
targeted backfill for whatever the refactor exposes.**

---

## Principle 7 — Terminology: Testing Library's vocabulary, not invented names (SETTLED)

We name things with the **established vocabulary of the tools**, not ad-hoc
labels. Two vocabularies, one per layer:

- **UI layer → Testing Library terms.** _Query_ (a method that finds an element),
  the _types of queries_ (`getBy` / `queryBy` / `findBy`, each with an `All`
  form), `screen`, `render`, _custom render_, _custom queries_ (`buildQueries` /
  `queryHelpers`). Guiding principle, verbatim: _"Your test should resemble how
  users interact with your code as much as possible."_
- **State layer → XState terms.** `createActor().start()`, `send()`,
  `getSnapshot().value` / `.context`, `provide({ actors, actions })`. Testing
  Library words do **not** apply here — these tests have no DOM.

**No "selector."** Testing Library deliberately avoids the word; it exists to
replace CSS-selector thinking. We follow the **query priority**:
`getByRole` → `getByLabelText` → `getByPlaceholderText` → `getByText` →
`getByDisplayValue` → `getByAltText` → `getByTitle` → `getByTestId` (last resort,
and only with a written reason). Accessible-name/role queries _are_ our a11y net
by construction.

---

## Principle 8 — Test file & folder structure (SETTLED)

**Locality rule:** put each helper/query/fixture at the **lowest folder that owns
it**; promote to global `test/` only when it is genuinely shared across areas.
Test files stay **thin and readable** — arrange via a `setup*`/`render*` helper,
act via `user-event`, assert via queries.

### Global — `test/` (cross-cutting only)

- `render.tsx` — the custom `render` (wraps the app providers: theme, nuqs,
  `QueryClient` retry-off, scene provider) **and re-exports** everything from RTL
  plus `userEvent`. This is the Testing Library "test-utils" role for the project.
- `queries.ts` — global custom queries (`buildQueries`), merged into
  `render`/`screen`.
- `fixtures/`, `mocks/`, `vitest.setup.ts` — already present.

### Per-folder — `…/__tests__/`

One folder per test area, holding only what that area owns:

- `queries.ts` — local custom queries **(UI only)**.
- `utils.ts` — local helpers + `setup*` / `render*` wrappers. **This file name is
  used everywhere** (UI and state). For the machines area it exports
  `setupSceneSystem` (the renamed `harness.ts`); `setupSceneSystem` may take an
  `input` to vary the booted system as later tests demand.
- `data.ts` — local mock data / fixtures, **only if needed**.
- `<name>.test.tsx` (or `.test.ts` for the node/machines project).

Non-UI areas use the **same structure minus `queries.ts`**.

### Content contracts via custom queries

A genuine _content rule_ (e.g. "the market header must never imply the data is
live/real-time") is preserved when a presentational test is folded into its
region test — but expressed as a **custom query** so the assertion is one
readable line, not inline regex. Trivial "it renders X" lines are dropped (the
region render already covers them).

### Repetition → `it.each`, never forced

Use Vitest's **`it.each`** (table-driven tests) **only** when cases share an
identical body and differ solely by input/expected. Rows are **objects**
(`{ name, input, expected }`), not positional tuples, so each case reads itself.
If a case needs different setup or assertions — or a table needs an `if` inside —
it is **not** a table; write separate `it(...)` blocks. Never force unrelated
cases together.

---

## Principle 9 — Existing-test triage & migration order (SETTLED)

"Mostly integration" means a thin presentational component re-tested in isolation
_and_ inside its region is the trophy's "too many." We collapse to **per-region
integration tests**, each rendering its real components over the real machines.

### Disposition of the existing suite

- **Keep untouched (pure units / kernel anchor):** `lib/filters`,
  `lib/hex/aggregate`, `lib/hex/resolution`, `lib/search-params`, `lib/utils`,
  `data/loaders`, `data/repository`, `data/selectors`.
- **Fold into per-region integration** (contracts carried as custom queries; one
  `vitest-axe` assertion per rendered tree):
  - `map-legend`, `market-header` (+ `.a11y`) → **map** region
  - `kpi-row` → **analysis** region
  - `browse-summary`, `listing-card`, `listing-detail-body`, `sort-control` →
    **browse** region
- **Landing → one view test** (correct render + axe; the future **E2E entry
  point**): `home-view` becomes it; `home-view.a11y`, `city-picker`,
  `city-picker.a11y` fold in and are deleted.
- **No dedicated `*.a11y` files** — axe lives inside the region/view test as a
  single assertion on the real tree.
- **`system.smoke.test.ts` folds into the connected-system test** (its boot
  assertions become cases there, driven by `setupSceneSystem`).

### Migration order — delete after replace

Per Principle 6, **write the region test (carrying its contracts) first, then
delete the files it subsumes**, region by region. Never delete into a coverage
gap.

---

## Principle 10 — How a component/region is tested: a11y-first, async as a user (SETTLED)

A component test asserts **observable, user-facing behaviour over the real
machines** (Principle 1's tier B), and **accessibility is a required assertion,
not a nice-to-have**. Two rules:

### Accessibility is a test target

Queries are role/name-first (Principle 7), so the test _is_ an a11y probe by
construction, and every rendered state also gets a `vitest-axe` check. **If a
component isn't accessible enough to test this way, fix the component — that is a
gain, not scope creep.** Workarounds are allowed only when the accessibility
already exists and we merely can't reach it from the test; never to paper over a
missing label / role / live region.

### Async / loading states — the three-step shape

A user waits for data before acting, so a data-loading surface is tested in three
deterministic steps:

1. **Assert an accessible, expressive loading indicator** — a screen-reader user
   must know data is loading (e.g. a `role="status"` / `aria-busy` region, not a
   purely visual `aria-hidden` skeleton). Assert the _presence_ of that indicator.
2. **Trigger resolution deterministically** — `act()` or `user` input, then
   `await` the result (`findBy*`). **Never race ticks**: do not assert a state by
   relying on a fetch _not having resolved yet_ (`queryBy(...).toBeNull()` as a
   stand-in for "still loading"). That is the classic CI flake and is banned —
   assert the positive loading indicator instead.
3. **Assert the settled state** — the loading indicator is gone, the **data is
   present**, the result is **accessible** (`axe` + role/name queries), and the
   render is correct.

This shape is what makes the loading assertion both meaningful (a real a11y
contract) and stable (no timing race).

### Arrange / act / assert is visible in the test

A `setup*` helper does **arrange only** (render the world to first paint) and
**returns the acts as named functions**; the test performs them in its own body.
The reader must see the _act_ — `scene.navigateToCity()`, `await user.click(...)`
— not have it buried inside setup. A helper that silently performs the action it
is meant to be testing hides the behaviour and is the smell to avoid.

This also tends to surface real first-paint bugs: e.g. asserting the browse
loading state _before_ navigating exercises the city-less first render — exactly
where the empty-currency `Intl` crash lived — and forces it fixed (a gain, per
the accessibility stance above).

---

## Principle 11 — Comments earn their place (SETTLED)

The general comment conventions live in **`CLAUDE.md` → Comments** (why-not-what,
JSDoc on public API, keep-in-sync, no process artifacts). They apply to test code
too; the test-specific points on top:

- The `describe` / `it` descriptions and the self-named queries/helpers are the
  **primary documentation** — a comment exists only for what they can't carry.
- **One short top-of-file JSDoc** is allowed — the suite's purpose, or a scope
  boundary that has no `it` (e.g. "X and Y are E2E-only"). It must **not** restate
  the testing strategy or narrate the file's structure.
- **No structure labels** (`// arrange` / `// act`) — the named helpers and the
  step order already show it. Canonical good _why_ comment: _"reflects the selected
  key; the actual reorder needs Radix pointer APIs jsdom lacks, so it is proven in
  E2E."_

---

## Test infrastructure (setup plan)

Build infra **incrementally** — the minimum for the slice in front of us, grown
as slices demand. Not all upfront. Three phases, cheapest/headline first.

**Already in place:** Vitest (**three** projects: `node` for
`lib`/`data`/`scripts`, `dom` jsdom for `app`/`components`, and `machines`
node-env for `components/scene/state/**`), RTL, jsdom, vitest-axe,
xstate/@xstate/react, `server-only` shim, axe matchers. Plus the harnesses built
since: **MSW** (`msw` + `test/msw/server.ts`, wired into `vitest.setup.ts`),
**@testing-library/user-event**, the global custom render **`test/render.tsx`**
(`renderScene`), shared **`test/scene/fake-transport.ts`** and
**`test/fixtures/browse.ts`**, and the jsdom stubs that make the above work — a
sized `ResizeObserver` + `getBoundingClientRect` (the virtualizer needs a
viewport), `matchMedia`, `IntersectionObserver`, and a fixed jsdom origin so
relative `/api/...` fetches resolve for MSW.

### Phase A — Machine / state-layer tests — **DONE**

Landed: the node-env `machines` project; the connected-system harness
(`components/scene/state/machines/__tests__/harness.ts`, which boots the real
root+map+ui+worker system and injects the fake transport);
`__tests__/system.smoke.test.ts`; and the `map/transition-gating.test.ts`
executable spec (the companion proof to `docs/map-machine-transition-gating.md`).
_Pending tidy (Principles 8/9): rename `harness.ts → utils.ts` and fold the smoke
test into a connected-system test._ The original design notes below stand.

The headline (gating spec + connected machines) _and_ the cheapest.

- **Worker fake — no code change needed.** The root invokes `worker` with
  `input: {}` and the worker invokes `transport` with `input: {}`, so the
  `createWorker` seam is _not_ threaded to the top. For connected-system tests we
  therefore inject at the **transport** level: `rootMachine.provide({ actors: {
worker: workerMachine.provide({ actors: { transport: fakeTransport } }) } })`.
  The `fakeTransport` is a scriptable `fromCallback` that records the commands the
  worker sends and replays `TRANSPORT.LOAD_REPLY`/`PROCESS_REPLY` events on demand
  — bypassing the real `Worker` entirely and testing the worker-machine logic
  (routing, slot coalescing). The existing `createWorker` seam stays for _unit_-
  testing the thin `transportActor` in isolation later.
- **New `node`-env Vitest project** for `components/scene/state/**` machine tests
  — faster than jsdom, and _proves the machines are DOM-free_ (a real signal).
- **Connected-system helper** — `createActor(rootMachine)` + `system.get(...)` to
  reach child actors; start/teardown wrapper.

### Phase B — UI-story integration — **DONE (browse slice)**

Stood up by the first UI story (the browse region test). What shipped:

- **MSW** + `msw/node` server (`test/msw/server.ts`), wired into `vitest.setup.ts`,
  intercepting `fetch('/api/cities/[slug]/points')` and `/boundaries`. ✅
- **Fixtures** — **trimmed-real & tiny** in `test/fixtures/browse.ts` (framing +
  points + boundaries). ✅
- **@testing-library/user-event**. ✅
- **`renderScene()`** — the global custom render in `test/render.tsx` (real actor
  system over `QueryClient` retry-off + theme; faked transport; no-op URL sync). ✅
- **react-map-gl render-boundary mock** (Principle 2) in `__mocks__` — **still
  pending**; not needed by browse, deferred to the map region test.

### Phase C — E2E (defer until E2E slices)

Playwright + MapGrab + flag-gated `installMapGrab`.

### Cross-cutting — enforce now

**ESLint test plugins** (`eslint-plugin-testing-library` + `@vitest/eslint-plugin`)
wired now, so Principle 5.2's guardrails apply from the first test.

### Locked decisions

- Start with **Phase A**; build Phase B harness on first UI-story demand.
- Machine tests live in a **new node-env Vitest project**.
- Fixtures are **trimmed-real & tiny**.
- ESLint test plugins wired **now**.
- Worker injection uses the **existing `createWorker` seam** — no app code change.

---

## Status

All testing-strategy open questions are resolved (Principles 1–10, now covering
terminology, file/folder structure, the existing-test triage, and the a11y-first /
arrange-act-assert async rules). The only deferred item is **whether the AI PR
reviewer (5.3) has a free tier** — to be settled while building the CI/CD pipeline
(Workstream 4). This doc is ready to serve as source material for the polished
architecture/decision docs.

**Done:**

- **Phase A** — machine/state-layer harness + smoke + transition-gating spec
  (node-env `machines` project).
- **Phase B harness** — `test/render.tsx` (`renderScene`), MSW, fixtures,
  user-event, fake transport, jsdom stubs.
- **Browse region test** (`components/scene/browse/__tests__/`) — real components
  over real machines, following Principles 9 & 10 (carries the folded contracts,
  a11y-first loading assertion, AAA visible). Subsumed and deleted the listing-card
  / browse-summary / sort-control / listing-detail-body unit tests. En route it
  fixed two real component bugs: the `aria-hidden` (silent) loading skeleton → an
  accessible `role="status"` indicator, and the misleading "0 of 0" count during
  load; plus guarded the city-less first-paint empty-currency `Intl` crash.
- Full suite green; ESLint test plugins + `tsc` clean.

**Next:** the **analysis** and **map** region tests (the map one stands up the
react-map-gl render-boundary mock), then the landing view test, then the
machines-tier `harness.ts → utils.ts` rename + smoke fold, then Phase C (E2E).
