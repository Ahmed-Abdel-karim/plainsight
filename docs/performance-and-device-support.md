## Performance and device support

Plainsight is optimized primarily for desktop-class browsing, where the map, analysis panel, and Browse list can be used together as a dense analytical workspace.

The responsive mobile layout is supported for exploration and review. It preserves the same core workflows: opening a city, switching between Analyse and Browse, using filters, opening the market drawer, scrolling listings, and inspecting listing details.

Physical Android testing on a Samsung Galaxy phone showed that the app remains usable and responsive. Map interaction is naturally less fluid than on desktop-class hardware, especially during heavier map movement, but the interface does not block core workflows and remains acceptable for the project’s mobile support target.The remaining mobile work is UI, not compute: map zoom controls and legends need
to be more touch-friendly.

Mobile is therefore treated as a responsive compatibility target, not the primary performance benchmark. Desktop remains the reference environment for production performance budgets.

## Performance monitoring

Health is tracked with field data (real users, production) as the primary signal, and lab budgets in CI as the regression gate.

**Field — Vercel Speed Insights, production, p75** _(snapshot: 2026-06)_

| Metric                | Desktop | Mobile | Good threshold |
| --------------------- | ------- | ------ | -------------- |
| Real Experience Score | 100     | 98     | ≥ 90           |
| LCP                   | 0.74 s  | 1.87 s | ≤ 2.5 s        |
| INP                   | 72 ms   | 232 ms | ≤ 200 ms       |
| CLS                   | 0       | 0.02   | ≤ 0.1          |
| FCP                   | 0.74 s  | 1.5 s  | ≤ 1.8 s        |
| TTFB                  | 0.21 s  | 0.34 s | ≤ 0.8 s        |

Desktop passes every Core Web Vital. Mobile passes all but INP (232 ms, "needs improvement") — consistent with the known mobile-UI gap, where heavier map interaction on phone-class hardware is the main contributor.

**Lab — Lighthouse CI** runs on `/` and `/london` as an early-warning signal. Bundle size and CLS are hard gates; timing metrics are advisory only, because CI hardware is too noisy to gate on reliably. Field data above is the source of truth — a timing warning is a prompt to check the dashboard, not a blocker.

## Worker compute cost

The Web Worker keeps two synchronous costs off the main thread. One-time city load: parsing the rows asset (16.2 MB, 61,963 listings) costs ~31 ms. Recurring recompute (hex layer + market summary) costs ~80 ms per whole-city pass, dropping to ~35 ms when filtered, and runs on every filter or map-resolution change. Browse filter stays on the main thread (~18 ms, under the long-task threshold). Full method, numbers, and the decision rule: ADR 0005.
