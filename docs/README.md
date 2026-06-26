# Plainsight docs

This folder contains the deeper engineering documentation behind Plainsight.

For the portfolio narrative, start with the root-level [CASE_STUDY.md](../CASE_STUDY.md).  
For the quick project overview, start with the root-level [README.md](../README.md).

## Reading guide

| Document                          | Purpose                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| [Architecture](architecture.md)   | How the app is structured: routes, scene runtime, actor system, map lifecycle, data flow |
| [Decisions](decisions/)           | ADRs explaining why major technical choices were made                                    |
| [Performance](performance.md)     | Browser-side data, Web Worker projections, map persistence, and performance constraints  |
| [Accessibility](accessibility.md) | Accessibility strategy, map-as-enhancement approach, and current limitations             |
| [Design system](design-system.md) | Tokens, spacing rhythm, themes, responsive layout, and UI composition                    |
| [Data model](data-model.md)       | Inside Airbnb snapshots, transformed assets, provenance, and future import direction     |
| [Testing](testing.md)             | Testing strategy across unit, machine, UI integration, E2E, accessibility, and CI        |
| [Deployment](deployment.md)       | Public deployment, static assets, caching, analytics, and operational boundaries         |

## Suggested reading paths

For a quick review:

1. [README](../README.md)
2. [Case study](../CASE_STUDY.md)
3. [Architecture](architecture.md)

For a deeper frontend engineering review:

1. [Case study](../CASE_STUDY.md)
2. [Architecture](architecture.md)
3. [Performance](performance.md)
4. [Testing](testing.md)
5. [Decisions](decisions/)

For product/UI review:

1. [Case study](../CASE_STUDY.md)
2. [Design system](design-system.md)
3. [Accessibility](accessibility.md)
4. [Data model](data-model.md)

## Documentation status

Some documents may start as focused summaries and become deeper references over time. The goal is to keep each document scoped:

- README provides the concise project overview.
- CASE_STUDY explains why the project matters.
- docs/ proves the engineering decisions and tradeoffs.d
