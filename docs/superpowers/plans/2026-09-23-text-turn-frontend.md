# Text Turn Frontend P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` and complete targets in order. Do not combine targets into one commit.

**Goal:** Deliver a working real text E2E flow with a customer conversation and per-turn supervisor trace while leaving voice transport undefined until Tim publishes it.

**Architecture:** React components depend on a typed `TurnClient`, never directly on `fetch`. Isolated UI development may inject an explicit fixture client. The runtime composition root later injects `HttpTurnClient`, which validates Tim's published response and preserves backend semantics.

**Tech Stack:** React, TypeScript, Vite, pnpm, CSS Modules, Zod, Vitest, React Testing Library, Playwright, ESLint, Prettier.

**Approved spec:** `docs/superpowers/specs/2026-09-23-text-turn-frontend-design.md`

## Global constraints

- Work only on `danil/frontend`; change frontend files and Danil-owned state/handoff/docs only.
- Do not modify backend code, `.codex/INTEGRATION_CONTRACT.md`, `tim/backend`, or `main`.
- Use `POST /v1/turn/text` exactly as re-confirmed at `origin/tim/backend` commit `ce761bd`.
- Preserve backend ordering for `scenarios`; do not derive scenario, confidence, reason, actions, or latency.
- Treat `unknown` as a valid language and render nullable latency as `—`.
- Treat `requires_confirmation` as a scenario requirement, not an executed action.
- Real API failures remain failed turns. Never switch silently to fixtures.
- Voice transport, codecs, streaming, and assistant audio remain `UNKNOWN`.
- After every target: run its checks, update `DANIL_STATE.md`, inspect ordinary and staged diff, commit atomically, and push `origin danil/frontend`.

## TARGET 1 — Scaffold

**Files:**

- Create `frontend/package.json`, `pnpm-lock.yaml`, TypeScript/Vite/ESLint/Prettier configs, and `index.html`.
- Create the minimal `frontend/src/main.tsx`, `frontend/src/app/App.tsx`, CSS Module, global CSS, and smoke test.

- [x] Write the smoke test for the minimal application shell.
- [x] Scaffold React + TypeScript + Vite with CSS Modules and the smallest required tooling.
- [x] Add real `dev`, `build`, `typecheck`, `test`, `lint`, and `format:check` scripts.
- [x] Install and lock dependencies with pnpm.
- [x] Run format check, lint, type-check, tests, and production build.
- [x] Record the scaffold in Danil state and the branch's atomic scaffold commit.

## TARGET 2 — Domain types and TurnClient

**Files:**

- Create `frontend/src/shared/turn-client/contract.ts` and tests.
- Create `frontend/src/shared/turn-client/turn-client.ts`.
- Create an explicit fixture client only if needed for isolated UI tests.

- [x] Write failing contract tests for arrays of scenarios/alternatives, `unknown`, nullable latency, empty actions, and confirmation semantics.
- [x] Define `TurnInput`, `TurnResult`, trace types, and `TurnClient.submit(input)`.
- [x] Add Zod boundary validation matching the published response without invented fields.
- [x] Keep fixtures out of the runtime; controlled responses exist only in tests.
- [x] Run focused and full frontend checks.
- [x] Record the typed boundary in the branch's text implementation history.

## TARGET 3 — Customer text flow

**Files:**

- Create the reducer/controller and customer conversation components.
- Add component tests for history, pending, success, retry/error, and stable session use.

- [x] Write tests for sending a text turn, loading lockout, conversation history, retry, and failed-turn state.
- [x] Implement immutable per-turn records keyed by local turn ID.
- [x] Keep one selected trace tied to an explicit turn; pending and failed turns cannot borrow a previous trace.
- [x] Bound waiting, expose cancellation honestly, reject mismatched sessions, and ignore late responses.
- [x] Inject `TurnClient`; do not bind components to `fetch`.
- [x] Keep one session ID for the lifetime of the conversation.
- [x] Add semantic text input, send state, loading state, and retry/error state without decorative extras.
- [x] Run focused and full checks and record the result in Danil state.

## TARGET 4 — Supervisor trace

**Files:**

- Create supervisor trace components and responsive CSS.
- Extend component tests for all published trace fields.

- [x] Write tests for transcript, language, multiple scenarios in backend order, confidence, reason, alternatives, slots, empty actions, continuation, clarification, handoff, confirmation requirement, and all latency fields.
- [x] Render `unknown` explicitly and every `null` latency as `—`.
- [x] Never expose hidden chain-of-thought or present `requires_confirmation` as an executed action.
- [x] Keep conversation and supervisor surfaces reachable at 360 px without horizontal page scrolling.
- [x] Run focused, full, and browser checks and record the result in Danil state.

## TARGET 5 — Real HttpTurnClient

**Files:**

- Create `frontend/src/shared/turn-client/http-turn-client.ts` and tests.
- Modify the composition root and Vite/runtime configuration only after inspecting Tim's actual backend runtime.
- Document the minimal base URL/proxy behavior in `frontend/README.md`.

- [x] Inspect backend runtime/config read-only from `origin/tim/backend`; do not guess host or port.
- [x] Write tests for the exact request, success validation, `422`, `502`, `503`, `504`, network failure, and invalid success payload.
- [x] Implement `POST /v1/turn/text` behind `TurnClient` with no fixture fallback.
- [x] Map FastAPI error payloads to safe failed-turn messages.
- [x] Ensure provider secrets never enter frontend code or environment variables.
- [x] Run checks and record the adapter evidence in Danil state/handoff.

## TARGET 6 — Text E2E

**Files:**

- Create Playwright coverage under `frontend/e2e/`.
- Update `frontend/README.md`, `DANIL_STATE.md`, and `DANIL_TO_TIM.md`.

- [x] Write browser tests for a successful text turn and responsive access using intercepted responses.
- [x] Cover multiple scenarios, confirmation, backend failure, unknown language, and null latency with automated test responses; component/schema tests cover the contract variants.
- [x] Start the real backend without changing Tim's branch and run a real frontend-to-backend smoke.
- [x] Clearly separate intercepted/test-response evidence from real backend evidence.
- [x] Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.
- [x] Record commands, evidence, and limitations in Danil state/handoff.
- [x] Inspect diffs and prepare the final atomic TEXT E2E verification commit for push and Tim review.

## After TEXT E2E

Only then begin browser microphone permission, `MediaRecorder`, record/stop/cancel, audio object, and voice UI states. Keep browser capture behind a future voice adapter and do not invent backend audio transport.
