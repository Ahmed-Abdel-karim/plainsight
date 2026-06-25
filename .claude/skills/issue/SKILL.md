---
name: issue
description: >-
  Create a well-formed GitHub issue on Ahmed-Abdel-karim/plainsight from the
  current conversation via the gh CLI. Use whenever the user says to "create / file
  / open an issue", "make a bug / feature / enhancement / chore out of this",
  "track this", or "log that" about something found mid-chat — turn the finding
  into a structured, correctly-labeled issue and hand back the URL. Works in any
  agent with shell access to an authenticated gh.
---

# File a GitHub issue from chat

Turn something found in conversation into a structured issue on
`Ahmed-Abdel-karim/plainsight` using `gh issue create`, then return the URL. Don't
make the user leave the chat or hand-write the issue body.

## Preconditions

`gh` must be installed and authenticated. Check first:

```bash
gh auth status
```

If it errors (missing or unauthed), stop and tell the user to run
`! gh auth login` here in the session — only they can do the interactive login.
Don't attempt to work around it.

## Compose the issue

Synthesize from the conversation — never file a one-line scribble:

- **Title** — imperative, prefixed by type: `bug: …`, `feat: …`, `enhance: …`,
  `chore: …`. Keep it specific.
- **Body** (markdown) — include, as applicable:
  - the problem / current behavior and why it matters,
  - relevant context from the chat,
  - **affected files** as `path:line` refs (clickable),
  - expected behavior or a short proposal,
  - acceptance criteria as a `- [ ]` checklist.

## Pick labels

Always exactly one `type:` and one `area:`; add `priority:` only if the user
signaled urgency. Vocabulary (source of truth: `.github/labels.sh`):

- `type:` — `bug` · `feature` · `enhancement` · `chore` · `docs` · `refactor` · `test`
- `area:` — `scene` · `map` · `browse` · `analysis` · `state` · `data` · `infra`
  (mirrors `features/scene/{map,browse,analysis}`, `scene/state`, `data/`, CI/build)
- `priority:` — `high` · `medium` · `low`
- add `needs-triage` for `bug`/`feature`/`enhancement` filed without a priority.

## Create it

```bash
gh issue create \
  --title "feat: <title>" \
  --body  "<markdown body>" \
  --label "type: feature" --label "area: browse" --label "needs-triage"
```

Confirm the labels exist (they come from `.github/labels.sh`); if a `gh` label
error says one is missing, tell the user to run `bash .github/labels.sh` once.

Report the returned issue URL back to the user. Don't assign, close, or modify
anything else unless asked.
