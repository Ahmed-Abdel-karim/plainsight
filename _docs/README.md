# Draft Architecture Docs

This folder is a staging area for future project documentation. It is not active
project guidance yet. Keep these files skeletal until the refactor is finished,
then fill them with clean, short rules and move or merge them into the active
`docs/` tree.

## How To Use This Folder

- Use `architecture.md` for what the system is: high-level module boundaries,
  runtime flow, data flow, state management, and diagrams.
- Use `project-boundaries.md` for what the system must support and what it
  deliberately does not support: functional requirements, non-functional
  requirements, deployment constraints, assumptions, limitations, browser
  support, and cost boundaries.
- Use `conventions.md` for how contributors work in this repo: folder structure,
  naming, import rules, component rules, design token usage, styling rules, and
  links to deeper practice docs.
- Use `testing.md` for the testing strategy: philosophy, test layers, E2E scope,
  mocking rules, file placement, commands, and references.
- Use `decisions/` for why important architecture choices were made. These are
  ADRs, not general rules. Prefer short records for decisions that changed the
  system shape or constrain future work.
- Use `AGENTS.md` and `CLAUDE.md` as staged future AI-agent instruction
  templates only. They are intentionally inside `_docs/` so they are not active
  repo instructions yet.

## What Goes Where

```text
_docs/
  README.md                 # this usage guide
  architecture.md           # system overview and diagrams
  project-boundaries.md     # requirements, constraints, assumptions, limits
  conventions.md            # contributor rules and repo conventions
  testing.md                # testing philosophy, layers, rules, commands
  AGENTS.md                 # staged future shared agent instructions
  CLAUDE.md                 # staged future Claude wrapper/import file
  decisions/
    README.md               # ADR index and ADR usage rules
    0000-template.md        # ADR template
```

## Real-World References

- Backstage keeps ADRs under `docs/architecture-decisions/` with an index and a
  small template:
  https://github.com/backstage/backstage/tree/master/docs/architecture-decisions
- Spotify Engineering recommends ADRs for significant decisions that affect how
  engineers write software:
  https://engineering.atspotify.com/2020/04/when-should-i-write-an-architecture-decision-record/
- GitLab uses version-controlled architecture design documents as engineering
  guardrails:
  https://handbook.gitlab.com/handbook/engineering/architecture/design-documents/
- arc42 provides the broader architecture-documentation categories used here:
  requirements, constraints, quality goals, risks, and decisions:
  https://docs.arc42.org/home/
- C4 gives a concise diagram vocabulary for context, container, component,
  dynamic, and deployment views:
  https://c4model.com/
- Codex uses `AGENTS.md` as durable repo-level guidance:
  https://developers.openai.com/codex/guides/agents-md.md
- Claude Code can import shared memory files with `@path`, which allows a future
  `CLAUDE.md` to import `AGENTS.md` instead of duplicating it:
  https://docs.anthropic.com/en/docs/claude-code/memory
