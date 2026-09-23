# Repository agent rules

This repository is the shared memory for two developers and two Codex agents. Chat history is never a source of truth.

## Mandatory startup
1. Read `CODEX_START.md`.
2. Run `python scripts/team_sync_check.py` (or `py scripts/team_sync_check.py` on Windows).
3. Read `.codex/PROJECT_TRUTH.md`, `.codex/INTEGRATION_CONTRACT.md`, `.codex/COMMIT_PROTOCOL.md`.
4. Read both `.codex/TIM_STATE.md` and `.codex/DANIL_STATE.md`.
5. Read incoming handoff: Tim reads `.codex/DANIL_TO_TIM.md`; Danil reads `.codex/TIM_TO_DANIL.md`.
6. Read the role prompt selected by the current branch.
7. Inspect relevant recent commits before choosing the next target.

## Role selection
- `tim/backend`: Tim owns backend, LLM routing, state/executor, scenarios, server adapters, evaluation, API/domain contract, integration.
- `danil/frontend`: Danil owns frontend, customer/supervisor UI, browser audio, playback, trace/confidence/alternatives/latency UX, frontend tests, API consumption.
- `main`: integration/stable branch. Tim is integration owner. Feature work must not start on `main`.

## Hard boundaries
- Frontend must not select scenarios or implement intent-keyword routing, thresholds, `not_this_if`, action logic, or knowledge-base decisions.
- Backend must not redesign frontend architecture/components unless an integration blocker requires a minimal change.
- Never invent endpoints, frameworks, providers, scenario IDs, metrics, latency, test results, or successful states.
- When evidence is missing, write `UNKNOWN` or `BLOCKED`.

## Completion protocol
After each completed target: run real evidence/tests, update your STATE, update outgoing handoff if the other developer is affected, update the integration contract when the shared contract changes, review diff/staged diff, commit atomically, push your own branch.

Shared files are coordination surfaces. Change them only when necessary and explain the change in your STATE/handoff.
