---
name: issue
description: Create a structured GitHub issue on Ahmed-Abdel-karim/plainsight from the current conversation. Use only when the user explicitly asks to create, file, open, track, or log a bug, feature, enhancement, chore, or other work item; never treat discussion alone as authorization for the external side effect.
---

# File a Plainsight Issue

Turn the authorized work into a specific, correctly labeled issue and return its
URL. Do not create, assign, close, or modify any other issue.

## Check access

Run `gh auth status`. If GitHub CLI is missing or unauthenticated, stop and tell
the user to run `gh auth login`; do not attempt to bypass interactive login.

## Compose the issue

- Use an imperative title prefixed by `bug:`, `feat:`, `enhance:`, `chore:`,
  `docs:`, `refactor:`, or `test:`.
- Explain the current behavior or need, why it matters, relevant conversation
  context, expected behavior or proposal, and acceptance criteria as a checklist.
- Include affected `path:line` references when they are known and verified.
- Do not include secrets, private vulnerability details, or unsupported claims.

## Choose labels

Read `.github/labels.sh` immediately before filing; it is the source of truth.
Select exactly one `type:` label and one `area:` label. Add `priority:` only when
the user supplied urgency. Add `needs-triage` to bugs, features, and enhancements
without a priority.

If the report is a security vulnerability, do not create a public issue. Follow
`SECURITY.md` and report the private path to the user.

## Create and verify

Use `gh issue create` with the composed title, body, and labels. If GitHub reports
a missing label, stop and tell the user that repository labels must be synced
with `bash .github/labels.sh`; do not silently substitute another label.

Return the URL emitted by GitHub and summarize the filed title and labels.
