# DANIL_STATE.md — Danil/frontend persistent agent memory

Owner: Danil's computer / frontend Codex.

Only Danil's agent should normally edit this file.

At the end of EVERY completed target action, update this file in the same commit.

## Current branch
`danil/frontend`

## Current objective
Agree the Phase 1 frontend architecture and UX before scaffolding any application code.

## Last completed goal
Verified the local provider credential setup and recorded the server-only boundary for OpenAI and NVIDIA secrets before frontend scaffolding.

## Verified facts about current frontend
- `danil/frontend` was synchronized with `origin/danil/frontend` before the audit.
- The tracked repository contains documentation, Codex coordination files, the source case document, and the official starter kit only.
- No `package.json`, lockfile, frontend framework, build configuration, source directory, UI, or frontend test runner exists.
- No frontend build or test command can run until a frontend project and its scripts exist.
- Repository-wide implementation search found no customer conversation UI, microphone/audio browser code, backend adapter, or supervisor trace UI.
- The official starter kit contains 40 business scenarios, 3 system intents, 104 development utterances, and 10 annotated dialogs.
- Local frontend-capable tooling is available: Node.js `v24.19.0`, npm `11.17.0`, and pnpm `11.19.0`.
- The ignored local `.env.local` contains non-empty `OPENAI_API_KEY` and `NVIDIA_API_KEY` entries; neither uses a browser-public `VITE_`, `NEXT_PUBLIC_`, or `PUBLIC_` prefix.
- The obsolete `.envNVIDIA.local` file is absent and `.env.local` is ignored by the repository's `.env.*` rule.
- Read-only authentication checks against the official OpenAI and NVIDIA hosted API model-list endpoints both returned HTTP 200 without printing either secret.
- No application manifest or source code exists yet, so there is no project dev server to restart and no current browser/server credential usage to repair.
- The repository currently has no tracked `.env.example`; this shared environment contract must be added with variable names only when the backend provider adapters are implemented.

## UI components currently working
- None.

## Voice capture/playback status
- Not implemented.

## Backend integration status
- Contract: `.codex/INTEGRATION_CONTRACT.md`
- The contract defines the domain-level turn/trace shape but intentionally defines no HTTP/WebSocket transport or endpoint.
- Actual transport/endpoints: UNKNOWN pending Tim's backend audit and handoff.

## Open frontend blockers
- Frontend stack, architecture, and customer/supervisor UX are not yet selected or designed.
- Backend transport/endpoints remain `UNKNOWN` until Tim's audit and handoff; Phase 1 must keep any fixture boundary isolated from transport assumptions.
- Canonical frontend format, lint, type-check, build, and test commands do not exist yet.

## Missing P0 frontend capabilities
- Customer text-input fallback and conversation history.
- Browser microphone permission, capture, recording, send, cancel, retry, and denial states.
- Assistant text response and response-audio playback/fallback states.
- Backend service/adapter mapped to a real transport contract.
- Supervisor trace after every user turn, including scenarios, confidence, reasons, alternatives, slots, actions, continuation, clarification/handoff state, and real timings.

## Decisions made
- Work on `danil/frontend`; Tim owns integration into `main`.
- OpenAI API is the initial LLM provider; no provider secret may be exposed in browser code.
- Phase 0 made no dependency, application, UI, or shared-contract changes.
- `TASKS.md` remains unchanged because the audit did not complete a product capability.
- `OPENAI_API_KEY` and `NVIDIA_API_KEY` are server-only secrets. Frontend code must never read them or introduce public-prefixed aliases; browser voice UX sends audio through the agreed backend adapter and receives transcript/audio results.
- NVIDIA STT/TTS provider calls belong to Tim's server-side adapters under the existing team split. Danil owns microphone capture, transport, playback, and related UI states only.

## Latest commands actually run
- `git pull --rebase origin danil/frontend` reported `Already up to date`.
- `rg --files --hidden -g '!.git/**' -g '!.env*'` found only documentation, coordination files, and starter-kit/source assets.
- Targeted manifest/source/config search found no frontend application files.
- Targeted implementation search found only scenario-related lines in `starter-kit/evaluate.py`, not browser application code.
- Frontend build and tests were explicitly skipped because `package.json` and configured frontend scripts do not exist.
- `node --version`, `npm --version`, and `pnpm --version` reported `v24.19.0`, `11.17.0`, and `11.19.0`.
- Safe `.env.local` checks confirmed both server-only variable names without exposing values, confirmed removal of `.envNVIDIA.local`, and confirmed Git ignore coverage.
- Repository-wide searches excluding `.env*` found no public-prefixed provider secrets, direct OpenAI/NVIDIA API calls, application manifests, or frontend/backend source trees.
- Read-only `GET /v1/models` authentication checks returned HTTP 200 from both `api.openai.com` and `integrate.api.nvidia.com`.

## Next exact target action
Use the `brainstorming` workflow to agree the frontend stack, customer conversation UX, supervisor trace UX, and isolated fixture boundary; then write the Phase 1 implementation plan before scaffolding.

## Do not forget
- Do not invent backend endpoints.
- Do not implement routing logic in frontend.
- Do not fake latency.
- Keep text fallback.
- Trace must update after every user utterance.
- Commit and push after every completed target action.
