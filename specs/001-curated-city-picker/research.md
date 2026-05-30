# Research: Curated City Picker

## Decision: Use `data/json/cities.json` through `getCitiesData()`

**Rationale**: The feature requires the exact launch set from the data directory. The existing loader maps `CityIndexEntry` into UI-facing `CityData` and already caches the result for static launch data.

**Alternatives considered**: Duplicating the city list in `app/page.tsx` was rejected because it can drift from the data source. Reading individual city datasets was rejected because the picker only needs index metadata.

## Decision: Keep `/` server-rendered and use a narrow client boundary for cards

**Rationale**: Server rendering keeps the data-backed launch set simple and cacheable. A small Client Component is necessary because native links activate with Enter but not Space, and the spec requires Space selection.

**Alternatives considered**: A plain anchor-only grid was rejected because Space activation would not be guaranteed. Making the whole page a Client Component was rejected because only the key handler needs client behavior.

## Decision: Use Next.js `Link` to navigate to `/${slug}`

**Rationale**: Next.js supports dynamic route links with string hrefs such as `/${city.slug}`. The slug is already stable and human-readable in the data source.

**Alternatives considered**: Imperative navigation with a button was rejected because links better express navigation semantics and work naturally with browser affordances.

## Decision: Add a minimal root-level dynamic city route shell

**Rationale**: The picker acceptance criteria require selection to navigate to `/[city]`. A minimal dynamic route lets acceptance testing verify that each launch city has a concrete destination and that unknown slugs 404.

**Alternatives considered**: Deferring the route was rejected because successful navigation would otherwise land on a missing route instead of a market page placeholder.

## Decision: Handle unknown slugs with `notFound()`

**Rationale**: Next.js 16 Cache Components rejects `dynamicParams = false` route segment config. The route can still generate known launch-city params and call `notFound()` when a slug does not resolve to a city dataset.

**Alternatives considered**: Keeping `dynamicParams = false` was rejected because it fails the production build when Cache Components are enabled.

## Decision: Rebuild the landing design with shadcn and tokens

**Rationale**: The constitution and component rules require shadcn composition and token utilities. `design/app/RentalScope Landing.html` is the visual target, not implementation code.

**Alternatives considered**: Copying prototype CSS/HTML was rejected because it violates the project component rules and risks token/theme drift.
