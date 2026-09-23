# DANIL_STATE.md — Danil/frontend persistent agent memory

Owner: Danil's computer / frontend Codex.

Only Danil's agent should normally edit this file. Update it in every completed frontend target commit.

## Current branch

`danil/frontend`

## Current objective

Deliver the user-referenced Saqta text UI, keep it available for manual review with a real local backend, and close frontend MVP gaps without inventing the pending voice contract.

## Last completed goal

Implemented the Saqta reference screens with per-scenario reason/confidence, explicit API states, transcript, and mobile non-overlay composer. Verified long-history scrolling, historical trace navigation, 320/360 px and 200% text, and genuine local backend success and missing-provider error paths.

## Verified frontend facts

- `frontend/` is a React 19 + TypeScript 5.9 + Vite 8 application managed by pnpm 11.
- The project has working format, lint, type-check, unit-test, browser-test, build, and dev commands.
- `pnpm-lock.yaml` is committed for reproducible installation.
- The customer surface provides text input, immutable history, pending/success/error states, duplicate-submit lockout, cancellation, and retry in the same local turn record.
- One browser session ID is retained across conversation turns.
- `HttpTurnClient` sends the exact `{session_id, text}` payload to `POST /v1/turn/text`, validates success data with Zod, rejects a mismatched response session, and enforces a 60-second client deadline.
- HTTP `422`, `502`, `503`, `504`, network failures, and invalid success payloads become failed turns; none create fixture routing data.
- Every completed reply keeps its own supervisor trace. The newest turn is selected automatically, and an older trace remains available through that turn's explicit trace control.
- Pending and failed turns never borrow the last successful trace; cancel/timeout wording does not claim that server-side processing stopped.
- Trace renders transcript, `ru|kk|mixed|unknown`, all scenarios in backend order, confidence, reason, alternatives, slots, actions, continuation, clarification, handoff, confirmation requirement, and all published latency fields.
- `null` latency renders as `—`; numeric latency is not recomputed.
- `requires_confirmation` is labelled as a requirement and explicitly says that the action has not run.
- Desktop and 320/360 px browser checks keep conversation and trace reachable without horizontal page overflow, including 200% text at 320 px. The last latency row is fully visible above the composer.
- Latest submitted replies remain visible as history grows; explicit history navigation disables automatic following. Selecting a historical trace reveals its heading and transcript.
- Empty/whitespace input disables Send. Concept placeholders are not application data; images are not required for understanding the UI.
- Provider credentials remain server-side; frontend configuration contains only the non-secret API base URL.

## Voice capture/playback status

- Not implemented in this milestone.
- Voice upload endpoint, accepted MIME/codec, streaming behavior, and assistant-audio representation remain `UNKNOWN`.
- Do not claim microphone, STT, TTS, or response-audio support until Tim publishes and implements that contract.

## Backend integration status

- Latest read-only source inspected: `origin/tim/backend` commit `ce761bd`; the text response shape is unchanged.
- Text endpoint: `POST /v1/turn/text` with documented `422`, `502`, `503`, and `504` errors.
- The earlier backend commit `2f20471` passed 17 tests. At current `ce761bd`, the full Windows run produced 63 passed and 1 failed: `test_atomic_write_creates_parent_and_preserves_unicode` read the UTF-8 JSON with the platform default encoding. This remains backend-owned.
- Real health check returned `status=ok`, `business_scenarios=40`, and `system_intents=3`.
- Direct real text smoke returned turn 1, language `ru`, scenario `SC11`, no clarification/handoff, real router latency about 5212.5 ms, and `null` STT/TTS timing.
- Playwright re-verified the current frontend → Vite proxy → Tim backend at `ce761bd` → OpenAI router → conversation + supervisor trace path: `1 passed`.
- A separate run without provider credentials verified a genuine backend `503` through the browser: `1 passed`; no intercepted response, fixture fallback, or stale successful trace.
- These are local checks on Danil's computer against an isolated checkout of Tim's code, not connectivity checks between the two computers.
- Tim's full 104-utterance evaluation baseline remains backend-owned and is not claimed by frontend.

## Automated verification evidence

From `frontend/`:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm peers check
```

Current results:

- Vitest unit/component/contract/regression tests: 21 passed;
- dependency-free transport/trace-selection checks: 23 passed;
- intercepted Playwright desktop + narrow tests: 11 passed; 5 skipped (four opt-in live cases and the desktop duplicate of the mobile geometry case);
- live Playwright browser-to-backend success: 1 passed when `REAL_BACKEND=1`;
- genuine backend missing-provider `503`: 1 passed when `REAL_BACKEND_FAILURE=1` (a separate isolated server run);
- build: passed;
- peer dependency check: no issues.

## Decisions made

- Work only on `danil/frontend`; Tim owns backend and integration into `main`.
- Do not modify the local shared integration contract from the frontend branch.
- Use `TurnClient` as the UI boundary; runtime defaults to `HttpTurnClient`.
- Controlled payloads exist only in tests. There is no automatic runtime fixture fallback.
- Frontend does not select or reorder scenarios, calculate confidence/reason, infer actions, or derive latency.
- `actions=[]` means no actions ran; configured scenario actions are not displayed as executed.
- Keep text E2E stable before beginning microphone/browser-audio work.

## Open blockers and limitations

- Voice transport and assistant-audio response are still undefined.
- Scenario execution is not implemented by backend, so real `actions` remains empty.
- Text STT and TTS-first-audio timings correctly remain unavailable.
- The observed real router smoke was functionally correct but slower than the project latency target; optimization remains backend-owned and must be evidence-driven.
- Repository-level one-command launch and final shared README integration remain Tim/integrator-owned.
- Official hackathon voice MVP is not ready: microphone → STT → router → TTS → playback is required; text is supplementary. Standalone browser recording can be prepared without an endpoint, but is not voice E2E.
- GitHub PR #2 is draft and reported not mergeable during the audit. No merge/conflict resolution was attempted from this branch. Tim's comment requesting real successful and failed browser turns is covered by the separate local checks above.

## Next exact target action

Keep the text UI running for user review; hand Tim the verified UI and exact missing voice-contract requirements. Next independent frontend slice: browser recorder/local playback with permission/error/cleanup tests, clearly labelled local-only. Wire voice transport and assistant playback only after Tim publishes the endpoint, codec, request/response, errors, and audio representation.

## Do not forget

- Do not invent backend endpoints or audio formats.
- Do not put `OPENAI_API_KEY` or `NVIDIA_API_KEY` in frontend code or `VITE_` variables.
- Do not fake latency, routing, actions, or successful backend state.
- Commit and push completed frontend targets only on `danil/frontend`.
