#!/usr/bin/env bash
# Source of truth for the repo's issue/PR label taxonomy.
# Idempotent: `gh label create --force` updates a label if it already exists.
# Run once (and after editing) with an authenticated gh:  bash .github/labels.sh
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install it and run 'gh auth login' first." >&2
  exit 1
fi

# label <name> <color-hex> <description>
label() { gh label create "$1" --color "$2" --description "$3" --force; }

# type:  what kind of work — mirrors conventional-commit types
label "type: bug"         "d73a4a" "Something is broken or behaves incorrectly"
label "type: feature"     "0e8a16" "New capability that doesn't exist yet"
label "type: enhancement" "a2eeef" "Improve something that already works"
label "type: chore"       "cfd3d7" "Maintenance, deps, tooling — no product change"
label "type: docs"        "0075ca" "Documentation only"
label "type: refactor"    "fbca04" "Internal restructuring, no behavior change"
label "type: test"        "bfd4f2" "Add or fix tests"

# priority:  how soon
label "priority: high"    "b60205" "Address next"
label "priority: medium"  "d4a72c" "Normal queue"
label "priority: low"     "c2e0c6" "Nice to have"

# area:  where in the codebase — mirrors features/scene/* + supporting layers
label "area: scene"       "5319e7" "features/scene shell, layout, cross-sub-domain"
label "area: map"         "1d76db" "Map sub-domain — MapLibre/WebGL, layers, legend"
label "area: browse"      "006b75" "Browse sub-domain — listing/filter panels"
label "area: analysis"    "e99695" "Analysis sub-domain — cards, derived metrics"
label "area: state"       "f9d0c4" "Scene state — XState/zustand actor system"
label "area: data"        "c5def5" "data/ contract, loaders, repository, public/data"
label "area: infra"       "d4c5f9" "CI/CD, build, config, tooling, deploy"

# workflow
label "needs-triage"      "ededed" "Not yet reviewed or prioritized"
label "blocked"           "000000" "Waiting on something else"

echo "Labels synced."
