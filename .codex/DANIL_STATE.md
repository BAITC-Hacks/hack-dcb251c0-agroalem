# DANIL_STATE.md — Danil/frontend persistent agent memory

Owner: Danil's computer / frontend Codex.

Only Danil's agent should normally edit this file.

At the end of EVERY completed target action, update this file in the same commit.

## Current branch
`danil/frontend`

## Current objective
Implement frontend P0 as independently verified atomic targets, beginning with the React/TypeScript/Vite scaffold.

## Last completed goal
Received explicit approval for the frontend design and the cascade from scaffold to real text E2E.

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
- Read-only source: `origin/tim/backend` commit `926ccec` publishes `POST /v1/turn/text`, its request/response schema, and `422`/`502`/`503`/`504` behavior.
- Text transport is documented, but browser-to-real-backend end-to-end behavior has not been run or confirmed on `danil/frontend`.
- Voice upload transport, accepted MIME/codec, and `assistant_audio` representation remain `UNKNOWN` pending Tim's voice handoff.

## Open frontend blockers
- Voice upload and response-audio contracts remain unknown; no audio endpoint may be guessed.
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
- Use React, TypeScript, Vite, pnpm, and CSS Modules for the browser application.
- Isolate UI from backend transport behind `TurnClient`, with a non-routing fixture adapter until Tim provides the real contract.
- Use batch `MediaRecorder` capture for P0; streaming remains out of scope until the working flow is measured.
- Add tests with each functional slice rather than postponing them to a final testing phase.
- Do not assign implementation agents until the approved implementation plan exposes independent, non-overlapping tasks.
- Implement the published text endpoint before microphone capture or response-audio playback.
- Use controlled responses only in tests or an explicitly selected development mode; real API errors remain failed turns.
- Do not create or change a root shared contract as part of the text frontend slice.

## Latest commands actually run
- `git fetch origin tim/backend` updated only the remote-tracking reference for read-only inspection.
- `git show origin/tim/backend:.codex/TIM_TO_DANIL.md`, `.codex/INTEGRATION_CONTRACT.md`, and `backend/app/main.py` confirmed the implemented text endpoint and the missing voice contract.
- `backend/app/schemas.py` and `backend/tests/test_api.py` were also inspected read-only to align validation and semantics.
- The approved Google Doc execution brief was read in full, including its only tab (`t.0`); it requires an atomic verified commit and push after each target.
- No backend-owned file, local shared integration contract, `tim/backend`, or `main` change was made.
- A premature uncommitted frontend scaffold was removed after the user withheld spec approval; no frontend runtime is claimed.

## Next exact target action
Complete TARGET 1: scaffold the minimal React + TypeScript + Vite + pnpm + CSS Modules application, prove its scripts, then commit and push it atomically.

## Do not forget
- Do not invent backend endpoints.
- Do not implement routing logic in frontend.
- Do not fake latency.
- Keep text fallback.
- Trace must update after every user utterance.
- Commit and push after every completed target action.
