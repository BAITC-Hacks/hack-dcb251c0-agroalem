# DANIL_STATE.md — Danil/frontend persistent agent memory

Owner: Danil's computer / frontend Codex.

Only Danil's agent should normally edit this file. Update it in every completed frontend target commit.

## Current branch

`danil/frontend`

## Current objective

Publish the user-requested root README update first, then connect the existing Saqta UI to Tim's newly published voice contract and prepare an online judge demo. The user clarified that offline inference is not required.

## Last completed goal

Updated root README with the hackathon purpose, branch-specific ready/pending status, actual separate-checkout startup commands, historical/live verification boundaries, and remaining judge-hosting gates. Fast-forwarded only danil/frontend from fcb9efb to published b3f0982; no backend/main merge.

## Verified frontend facts

- `frontend/` is a React 19 + TypeScript 5.9 + Vite 8 application managed by pnpm 11.
- The project has working format, lint, type-check, unit-test, browser-test, build, and dev commands.
- `pnpm-lock.yaml` is committed for reproducible installation.
- The customer surface provides text input, immutable history, pending/success/error states, duplicate-submit lockout, cancellation, and retry in the same local turn record.
- One browser session ID is retained across conversation turns.
- `HttpTurnClient` sends the exact `{session_id, text}` payload to `POST /v1/turn/text`, validates success data with Zod, rejects a mismatched response session, and now enforces the published 120-second deadline for routing plus grounded response.
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

- Browser recording and assistant playback are not connected in React yet; the microphone remains disabled.
- Contract v0.2 is now published in origin/tim/backend at 14346a1: multipart `/v1/turn/audio`, standalone transcription/speech, and optional MP3 base64 response. Read the remote contract, not this branch's stale common contract.
- AudioApiClient and audio.check.mjs were supplied in b3f0982. Locally executed `node --test scripts/audio.check.mjs`: 16 passed, using controlled responses only.
- Optional full-generation `latency_ms.tts`, assistant_audio, and audio_error are not yet consumed by the React schema/UI. `tts_first_audio` remains null and must not be relabelled.
- No live end-to-end audio result is claimed; preserve a completed text/trace when only TTS fails and retry only synthesis.

## Backend integration status

- Latest read-only source inspected: `origin/tim/backend` commit `14346a1`; text input is unchanged, response adds optional audio fields and full-generation TTS timing. Backend now includes grounded answers and OpenAI audio.
- The following live evidence is historical for backend `ce761bd`, not acceptance of `14346a1`:
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

Historical results for frontend fcb9efb / backend ce761bd:

- Vitest unit/component/contract/regression tests: 21 passed;
- dependency-free transport/trace-selection checks: 23 passed;
- intercepted Playwright desktop + narrow tests: 11 passed; 5 skipped (four opt-in live cases and the desktop duplicate of the mobile geometry case);
- live Playwright browser-to-backend success: 1 passed when `REAL_BACKEND=1`;
- genuine backend missing-provider `503`: 1 passed when `REAL_BACKEND_FAILURE=1` (a separate isolated server run);
- build: passed;
- peer dependency check: no issues.

Current b3f0982 verification during README update: standalone audio checks 16 passed; `pnpm check` stops at Prettier differences in AUDIO_HANDOFF.md, scripts/audio.check.mjs, src/shared/turn-client/audio.ts and client.ts. The remaining check chain was not reached. Preserve this distinction until the voice integration target runs all checks again.

## Decisions made

- Work only on `danil/frontend`; Tim owns backend and integration into `main`.
- Do not modify the local shared integration contract from the frontend branch.
- Use `TurnClient` as the UI boundary; runtime defaults to `HttpTurnClient`.
- Controlled payloads exist only in tests. There is no automatic runtime fixture fallback.
- Frontend does not select or reorder scenarios, calculate confidence/reason, infer actions, or derive latency.
- `actions=[]` means no actions ran; configured scenario actions are not displayed as executed.
- Keep text E2E stable before beginning microphone/browser-audio work.

## Open blockers and limitations

- Voice contract is published; React recording/playback, envelope validation, and live acceptance are still missing.
- Scenario execution is not implemented by backend, so real `actions` remains empty.
- Text STT and TTS-first-audio timings correctly remain unavailable.
- The observed real router smoke was functionally correct but slower than the project latency target; optimization remains backend-owned and must be evidence-driven.
- Tim's backend branch now has `run_mvp.py` for its built-in demo; it does not launch the separate React checkout. The root README update was explicitly assigned by the user. Final branch integration and a single combined launch remain open.
- Official hackathon voice MVP is not ready: microphone → STT → router → TTS → playback is required; text is supplementary. Standalone browser recording can be prepared without an endpoint, but is not voice E2E.
- GitHub PR #2 is draft and reported not mergeable during the audit. No merge/conflict resolution was attempted from this branch. Tim's comment requesting real successful and failed browser turns is covered by the separate local checks above.

## Next exact target action

Finish the README-only commit and push first. Then fix the accepted transport formatting, connect microphone/stop/cancel and explicit AI-audio playback to AudioApiClient, preserve current reference layout and test text/trace retention on TTS failure. Verify the latest backend separately. Judge access needs HTTPS hosting and server-only secrets; the supplied HackAlem workspace/API invitation is not an app deployment URL.

## Do not forget

- Do not invent backend endpoints or audio formats.
- Do not put `OPENAI_API_KEY` or `NVIDIA_API_KEY` in frontend code or `VITE_` variables.
- Do not fake latency, routing, actions, or successful backend state.
- Commit and push completed frontend targets only on `danil/frontend`.
