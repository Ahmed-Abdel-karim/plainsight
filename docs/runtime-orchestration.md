# Runtime Orchestration

This document contains actor diagrams and runtime sequences for Plainsight.

It does not replace [Architecture](architecture.md). Architecture explains the
system shape. This file shows how the scene actor system moves at runtime.

Keep this file diagram-first and prose-light. The implementation is the source
of truth.

## Diagram scope

Current diagrams:

1. actor topology;
2. root coordinator state diagram;
3. city navigation sequence.

Add more diagrams only when a runtime interaction is hard to understand from the
architecture overview and ADRs. Do not add one diagram per machine by default.

## Actor topology

```mermaid
flowchart TD
  provider["SceneProvider\nscene session"]
  root["root\nscene coordinator"]

  map["map\nMapLibre lifecycle + interaction"]
  ui["ui\nlens, selection, hover"]
  nav["navigation\nroute intent + commit"]
  worker["worker\nclient compute router"]
  city["city\nactive city lifecycle"]
  transport["transport\nlazy Web Worker pipe"]

  provider --> root

  root -->|"spawned in root context\nscene session"| map
  root -->|"spawned in root context\nscene session"| ui
  root -->|"invoked by root\nscene session"| nav
  root -->|"invoked by root\nscene session"| worker
  root -->|"spawned/replaced\nper active city"| city

  worker -->|"invokes"| transport

  ui -->|"UI.SET_LENS"| city
  ui -->|"MAP.SELECTION_CHANGED"| map
  map -->|"UI.SET_HOVER"| ui
  map -->|"MAP.RESOLUTION_CHANGED"| city
  city -->|"WORKER.REQUEST_*"| worker
  worker -->|"WORKER.* replies"| city
  nav -->|"NAV.STARTED"| root
  city -->|"CITY.READY / CITY.FAILED"| root
```

## Root coordinator

Root owns the city-switch window.

```mermaid
stateDiagram-v2
  [*] --> settled

  settled --> switching: NAV.STARTED / fanSuspend + prefetch
  settled --> settled: URL.SYNC / syncUrl

  switching --> switching: NAV.STARTED / fanSuspend + prefetch
  switching --> settled: CITY.READY / fanResume
  switching --> settled: CITY.FAILED / fanResume

  note right of switching
    URL.SYNC is intentionally unhandled.
    Transition-time clears must not clobber the URL.
  end note
```

City replacement is an action-level flow, not a separate root state:

```mermaid
flowchart LR
  changed["CITY.CHANGED"] --> cancel["send WORKER.CANCEL"]
  cancel --> stop["stop old city actor"]
  stop --> spawn["spawn new city actor"]
  spawn --> active["new city owns active slug + snapshot"]
```

## City navigation sequence

```mermaid
sequenceDiagram
  autonumber
  participant User as "User"
  participant CityLink as "City link"
  participant Nav as "navigation actor"
  participant Root as "root actor"
  participant Map as "map actor"
  participant UI as "ui actor"
  participant Route as "Next route"
  participant Loader as "SceneUrlLoader"
  participant City as "city actor"
  participant Worker as "worker actor"

  User->>CityLink: choose city
  CityLink->>Nav: NAV.INTENT(path)
  Nav->>Root: NAV.STARTED(path)
  Root->>Map: SUSPEND
  Root->>UI: SUSPEND
  Root->>Root: enter switching

  Route->>Nav: NAV.COMMIT(path)
  Nav->>Root: NAV.ENDED(path)

  Loader->>Root: CITY.CHANGED(city, initial filters)
  Root->>Worker: WORKER.CANCEL
  Root->>City: stop old city actor
  Root->>City: spawn new city actor

  City->>Worker: WORKER.REQUEST_LOAD / WORKER.REQUEST_*
  Worker-->>City: WORKER.FETCH_OK / WORKER.PROCESS_RESULT

  City->>Root: CITY.READY
  Root->>Map: RESUME
  Root->>UI: RESUME
  Root->>Root: enter settled
```

Safety properties:

- map and UI interaction are suppressed before the destination city is ready;
- old worker work is cancelled when the city actor is replaced;
- the switching window closes on either `CITY.READY` or `CITY.FAILED`;
- root drops URL writes while switching.

## Future diagram candidates

Add these only if the implementation becomes hard to follow without them:

- map parallel lifecycle/interaction state diagram;
- worker process-slot diagram;
- URL hydration/write-sync sequence;
- Analyse recomputation sequence.

If added, each diagram should stay focused on one concern and use real event
names from the machines.
