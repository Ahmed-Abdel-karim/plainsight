# Comment Rules

Prefer self-documenting code: better names, smaller functions, clearer types, and
stronger module boundaries come before comments.

Use comments only when they add information the code cannot express clearly:

- Explain why a non-obvious decision exists.
- Document a public contract, boundary, lifecycle, or invariant.
- Call out timing, ordering, caching, or concurrency constraints.
- Explain framework-specific tradeoffs, browser limitations, accessibility
  rationale, worker behavior, or actor coordination.
- Link to an external reference when the code depends on outside behavior.

Do not use comments to:

- Repeat what the code already says.
- Preserve implementation history, feature IDs, task IDs, or old component names.
- Describe previous versions of the code.
- Leave commented-out code.
- Narrate obvious JSX, simple assignments, or straightforward imports.

Use `/** ... */` JSDoc for exported public contracts when the name and type are
not enough. Use `//` for local implementation notes. Keep both short.

When code changes, update or delete nearby comments in the same change. A stale
comment is a bug.
