# Danil state

Role: frontend
Branch: `danil/frontend` (to be created on Danil's workstation from integrated shared bootstrap)

## Current objective
Not started. First action is frontend Phase 0 audit after syncing shared coordination.

## Last completed goal
None recorded.

## Verified repository facts
Shared coordination lives in Git and must be read before work.

## Frontend components working
`UNKNOWN` until Danil audits the real workspace.

## Backend integration
Domain-level contract exists. Concrete endpoint/transport is `UNKNOWN` and must not be invented.

## Environment/dependencies
`UNKNOWN` until manifests/lockfiles/README are inspected on Danil's workstation.

## Open blockers
No Danil workstation evidence has been committed yet.

## Decisions made
- Frontend consumes routing decisions; it never implements scenario selection.
- Verified progress must be committed with this state file.

## Commands actually run
None recorded by Danil.

## Last synced commit
`NOT_STARTED`

## Next exact target action
After shared bootstrap is integrated: pull latest `main`, create `danil/frontend`, run `python scripts/team_sync_check.py`, read `CODEX_START.md` and `prompts/DANIL_MASTER_PROMPT.md`, audit actual frontend stack without rewriting it, then commit verified findings with this state file.
