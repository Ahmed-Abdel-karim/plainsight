# Plainsight Engineering Docs

This folder contains the supporting engineering documentation for Plainsight.

The implementation is the source of truth. These docs explain the current system,
record load-bearing decisions, and define the rules contributors should follow.
When code and docs drift, update the docs in the same change that updates the
implementation.

Root [`AGENTS.md`](../AGENTS.md) is the canonical instruction file for coding
agents, including enforceable repository rules and the precedence between these
documents. Root `CLAUDE.md` imports it so Codex and Claude receive the same
guidance. The documents here retain detailed requirements, diagrams, examples,
and decision rationale; they must not contradict the root agent rules.

## Documentation model

The docs are intentionally split by reader need:

- **What must the product do?** See [Project boundaries](project-boundaries.md).
- **How is the system shaped?** See [Architecture](architecture.md).
- **How does the runtime move?** See [Runtime orchestration](runtime-orchestration.md).
- **Why was a load-bearing choice made?** See [Architecture decisions](decisions/README.md).
- **How do we prove behavior?** See [Testing strategy](testing.md).
- **How should contributors change code?** See [Conventions](conventions.md).

This follows a lightweight version of these documentation practices:

- Diátaxis: separate documentation by user need — explanation, how-to,
  reference, and tutorial.
- C4: keep architecture diagrams small, hierarchical, and audience-focused.
- arc42: cover goals, constraints, building blocks, runtime behavior, decisions,
  quality, and known risks without copying the full template.
- GitHub Mermaid: keep diagrams as code so they are version-controlled and
  reviewable.

## File ownership

| File                       | Owns                                                                                             | Does not own                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `project-boundaries.md`    | Functional requirements, non-functional requirements, assumptions, limits, non-goals, known gaps | Implementation design or ADR rationale              |
| `architecture.md`          | System shape, module boundaries, data model, runtime ownership, rendering model, safety rules    | Full state-machine diagrams or product requirements |
| `runtime-orchestration.md` | Actor diagrams, state diagrams, sequence diagrams, runtime movement                              | Architecture narrative or ADR rationale             |
| `testing.md`               | Test layers, contracts, mocks, commands, release confidence                                      | Architecture walkthrough                            |
| `conventions.md`           | Repository rules and contributor conventions                                                     | Requirements or decision history                    |
| `decisions/`               | Architecture Decision Records                                                                    | General architecture overview                       |

## What goes where

Use one canonical home for each idea:

| Topic                                    | Canonical home                                                  |
| ---------------------------------------- | --------------------------------------------------------------- |
| Product scope and non-goals              | `project-boundaries.md`                                         |
| Feature/module/layer boundaries          | `architecture.md`                                               |
| Persistent scene layout                  | ADR 0004 + short architecture summary                           |
| XState actor topology                    | `architecture.md` summary + `runtime-orchestration.md` diagrams |
| Runtime event sequences                  | `runtime-orchestration.md`                                      |
| Immutable snapshots                      | ADR 0003 + architecture data section                            |
| Snapshot tiers and calculation integrity | ADR 0006 + architecture data section                            |
| URL state semantics                      | ADR 0007 + architecture URL section                             |
| Test strategy                            | `testing.md`                                                    |
| Repo conventions                         | `conventions.md`                                                |
| Canonical coding-agent rules             | Root [`AGENTS.md`](../AGENTS.md)                                |

When another file needs the same idea, use one short sentence and link to the
canonical home instead of repeating the full explanation.

## Diagram policy

Use diagrams only when they reduce cognitive load.

- Put high-level system/data diagrams in `architecture.md`.
- Put state-machine and sequence diagrams in `runtime-orchestration.md`.
- Put diagrams in ADRs only when the decision is hard to understand without one.
- Prefer Mermaid code blocks over screenshots so diagrams are reviewable.
- Do not create a giant “whole app” diagram.

## Update checklist

When changing architecture, runtime, data flow, or tests, check whether the
change affects:

- [Architecture](architecture.md)
- [Runtime orchestration](runtime-orchestration.md)
- [Project boundaries](project-boundaries.md)
- [Performance and device support](performance-and-device-support.md)
- [Testing strategy](testing.md)
- [Conventions](conventions.md)
- [Architecture decisions](decisions/README.md)

Do not update every file by default. Update only the canonical home and any
short cross-reference that would otherwise become misleading.
