# Text Turn Frontend Slice Design

Status: approved for implementation on 2026-09-23 by the user-provided frontend execution brief.

Owner: Danil / frontend. Backend source re-verified read-only at `origin/tim/backend` commit `ce761bd`.

## Goal

Deliver the first runnable frontend slice: a customer text conversation and a per-turn supervisor trace connected to Tim's implemented `POST /v1/turn/text` endpoint.

## Contract facts

- Request: `{ "session_id": string, "text": string }`.
- `session_id` remains stable for the browser conversation.
- Response language accepts `ru`, `kk`, `mixed`, and `unknown`.
- Trace contains scenarios, alternatives, slots, actions, continuation, clarification, handoff, confirmation requirement, and latency.
- `stt` and `tts_first_audio` are `null` for text turns and render as `—`.
- `actions` is currently empty; `requires_confirmation` describes a scenario requirement and never means an action ran.
- Expected failures are `422`, `502`, `503`, and `504`.
- Voice upload and assistant-audio contracts remain unknown and are not implemented.

The local `.codex/INTEGRATION_CONTRACT.md` is not changed in this slice. The frontend consumes the published contract from Tim's branch through local validation and records the dependency in Danil-owned state.

## Runtime design

`HttpTurnClient` is the production/default path. It posts to relative `/api/v1/turn/text`; Vite strips the `/api` prefix and proxies to `http://127.0.0.1:8000/v1/turn/text` during development. An optional non-secret base URL may be configured for a deployment that supports cross-origin requests.

The adapter validates every success payload with Zod. Network, HTTP, and invalid-payload failures reject the turn. There is no automatic fixture fallback. Controlled responses exist only in unit/component tests and Playwright route interception.

The conversation controller creates one session ID on mount, appends an immutable pending turn, and attaches the matching response or error to that turn's local ID. Only one request is active at a time, preventing duplicate submits and ambiguous response pairing. A 60-second client deadline and manual cancellation stop browser waiting without claiming server cancellation; a mismatched response session and late responses are rejected.

## UI design

The interface uses a two-surface operational layout:

- customer conversation and composer are primary;
- supervisor trace is a decision ledger beside it on wide screens and below it on narrow screens;
- empty, processing, answered, and failed states are rendered in the conversation; the selected trace shows each API status flag explicitly;
- the microphone control is visibly unavailable with an explanation that the voice contract is pending.

Visual direction updated to the user's Saqta Insurance screen references on 2026-09-23: light canvas `#F3F6F8`, white surfaces, navy text `#102145`, teal controls `#007F8B`, and subdued red error surfaces. Typography is local `Segoe UI`/Arial, with no network font dependency.

The header uses the Saqta Insurance wordmark as text, Voice Router, and a Demo badge. Client and assistant messages are separate semantic cards; decorative avatars use letters, not required images. No inactive notification/profile controls are introduced from the concept art.

On desktop, conversation and trace scroll independently and the composer occupies a dedicated row below the conversation. On mobile, conversation and trace share one scroll area above a dedicated composer row. The composer does not overlay content. Safe-area spacing is preserved. At 320 px and 200% text sizing, controls wrap and latency rows stack; text is not shrunk to fit.

No graphical assets are required for this slice. A future optional brand mark may be SVG or transparent PNG/WebP at 512×512. Concept labels such as `[из API]` are never rendered as application data.

## Trace behavior

Each successful turn owns its transcript and trace. The newest turn is selected automatically, and every older trace remains reachable through an explicit per-turn control. A pending or failed turn never borrows the last successful trace. The supervisor surface shows:

- transcript and language, including `unknown`;
- every scenario with its own ID, confidence, and reason inside the same card;
- alternatives;
- slots and actions;
- continuation, clarification, handoff, and confirmation-required flags;
- STT, triage, router, response, TTS-first-audio, and total latency.

`null` renders as `—`; numeric values render with `мс` without deriving new latency. Four separate API-driven state rows show clarification, handoff, confirmation requirement, and continuation; no synthetic overall status hides simultaneous flags. Confirmation remains a requirement, not a completed action. Failed turns display the error and never reuse the previous turn's trace. Send is disabled for empty/whitespace input and while a request is active.

## Verification

- Vitest covers schema validation, HTTP behavior, stable session use, error mapping, response pairing, `unknown`, and `null` latency.
- React Testing Library covers conversation history, loading/error states, trace rendering, handoff, and confirmation wording.
- Playwright covers empty/whitespace input, per-scenario values, all state flags, historical selection, pending/error/retry, and mobile trace/composer geometry at desktop, 360 px, 320 px, and 200% text using intercepted responses.
- A real-backend smoke is reported separately and only as passed if Tim's backend is actually started and answers through the frontend path.
- A second opt-in real-backend check exercises a genuine missing-provider `503`, with no request interception or fixture fallback. Local backend checks do not establish connectivity between Danil's and Tim's computers.
