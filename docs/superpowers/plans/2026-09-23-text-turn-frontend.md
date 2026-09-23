# Text Turn Frontend P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` and complete targets in order. Do not combine targets into one commit.

**Goal:** Deliver a working real text E2E flow with a customer conversation and per-turn supervisor trace while leaving voice transport undefined until Tim publishes it.

**Architecture:** React components depend on a typed `TurnClient`, never directly on `fetch`. Isolated UI development may inject an explicit fixture client. The runtime composition root later injects `HttpTurnClient`, which validates Tim's published response and preserves backend semantics.

**Tech Stack:** React, TypeScript, Vite, pnpm, CSS Modules, Zod, Vitest, React Testing Library, Playwright, ESLint, Prettier.

**Approved spec:** `docs/superpowers/specs/2026-09-23-text-turn-frontend-design.md`

## Global constraints

- Work only on `danil/frontend`; change frontend files and Danil-owned state/handoff/docs only.
- Do not modify backend code, `.codex/INTEGRATION_CONTRACT.md`, `tim/backend`, or `main`.
- Use `POST /v1/turn/text` exactly as published at `origin/tim/backend` commit `926ccec`.
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

- [ ] Write the smoke test for the minimal application shell.
- [ ] Scaffold React + TypeScript + Vite with CSS Modules and the smallest required tooling.
- [ ] Add real `dev`, `build`, `typecheck`, `test`, `lint`, and `format:check` scripts.
- [ ] Install and lock dependencies with pnpm.
- [ ] Run format check, lint, type-check, tests, and production build.
- [ ] Update `DANIL_STATE.md`, inspect diffs, commit `frontend(core): scaffold Voice Router application`, and push.

## TARGET 2 — Domain types and TurnClient

**Files:**

- Create `frontend/src/shared/turn-client/contract.ts` and tests.
- Create `frontend/src/shared/turn-client/turn-client.ts`.
- Create an explicit fixture client only if needed for isolated UI tests.

- [ ] Write failing contract tests for arrays of scenarios/alternatives, `unknown`, nullable latency, empty actions, and confirmation semantics.
- [ ] Define `TurnInput`, `TurnResult`, trace types, and `TurnClient.submit(input)`.
- [ ] Add Zod boundary validation matching the published response without invented fields.
- [ ] Keep any fixture adapter separate and opt-in; it must not route from input text.
- [ ] Run focused and full frontend checks.
- [ ] Update state, inspect diffs, create an atomic commit, and push.

## TARGET 3 — Customer text flow

**Files:**

- Create the reducer/controller and customer conversation components.
- Add component tests for history, pending, success, retry/error, and stable session use.

- [ ] Write failing tests for sending a text turn, loading lockout, conversation history, and a failed-turn state.
- [ ] Implement immutable per-turn records keyed by local turn ID.
- [ ] Inject `TurnClient`; do not bind components to `fetch`.
- [ ] Keep one session ID for the lifetime of the conversation.
- [ ] Add semantic text input, send state, loading state, and retry/error state without decorative extras.
- [ ] Run checks, update state, inspect diffs, create an atomic commit, and push.

## TARGET 4 — Supervisor trace

**Files:**

- Create supervisor trace components and responsive CSS.
- Extend component tests for all published trace fields.

- [ ] Write failing tests for transcript, language, multiple scenarios in backend order, confidence, reason, alternatives, slots, empty actions, continuation, clarification, handoff, confirmation requirement, and all latency fields.
- [ ] Render `unknown` explicitly and every `null` latency as `—`.
- [ ] Never expose hidden chain-of-thought or present `requires_confirmation` as an executed action.
- [ ] Keep conversation and supervisor surfaces reachable at 360 px without horizontal page scrolling.
- [ ] Run checks, update state, inspect diffs, create an atomic commit, and push.

## TARGET 5 — Real HttpTurnClient

**Files:**

- Create `frontend/src/shared/turn-client/http-turn-client.ts` and tests.
- Modify the composition root and Vite/runtime configuration only after inspecting Tim's actual backend runtime.
- Document the minimal base URL/proxy behavior in `frontend/README.md`.

- [ ] Inspect backend runtime/config read-only from `origin/tim/backend`; do not guess host or port.
- [ ] Write failing tests for the exact request, success validation, `422`, `502`, `503`, `504`, network failure, timeout/stale handling if required by frontend state, and invalid success payload.
- [ ] Implement `POST /v1/turn/text` behind `TurnClient` with no fixture fallback.
- [ ] Map FastAPI error payloads to safe failed-turn messages.
- [ ] Ensure provider secrets never enter frontend code or environment variables.
- [ ] Run checks, update state/handoff, inspect diffs, create an atomic commit, and push.

## TARGET 6 — Text E2E

**Files:**

- Create Playwright coverage under `frontend/e2e/`.
- Update `frontend/README.md`, `DANIL_STATE.md`, and `DANIL_TO_TIM.md`.

- [ ] Write browser tests for a successful text turn and responsive access using intercepted responses.
- [ ] Cover RU, KK/mixed rendering, multiple scenarios, clarification, handoff, backend failure, and null latency with automated test responses.
- [ ] Start the real backend without changing Tim's branch and attempt a real frontend-to-backend smoke.
- [ ] Clearly separate intercepted/test-response evidence from real backend evidence.
- [ ] Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.
- [ ] Record commands, evidence, limitations, and commit SHA in Danil state/handoff.
- [ ] Inspect diffs, create the final atomic TEXT E2E commit, push, and report readiness to Tim.

## After TEXT E2E

Only then begin browser microphone permission, `MediaRecorder`, record/stop/cancel, audio object, and voice UI states. Keep browser capture behind a future voice adapter and do not invent backend audio transport.
