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
- a status rail communicates ready, processing, answered, failed, and operator-handoff states;
- the microphone control is visibly unavailable with an explanation that the voice contract is pending.

Visual direction: an agricultural operations ledger rather than a generic SaaS dashboard.

- field paper `#F4F1E7`;
- deep pine `#173F35`;
- harvest orange `#E87832`;
- mist green `#DCE8E0`;
- graphite `#1B2522`;
- alert clay `#A63D32`.

Typography uses local system fonts for offline reliability: `Georgia` for restrained display text, `Segoe UI Variable`/`Segoe UI` for body copy, and `Consolas` for trace values. The signature element is the vertical per-turn decision ledger connecting transcript, route, and timing.

The design deliberately avoids a dark neon console, excessive cards, gradients, and decorative charts. Images are not required. Optional future assets can replace the CSS brand mark without changing layout:

- square mark: SVG preferred, or transparent WebP/PNG at 512×512;
- optional quiet header texture: AVIF/WebP at 1600×900, under 250 KB, with no embedded text.

## Trace behavior

Each successful turn owns its transcript and trace. The newest turn is selected automatically, and every older trace remains reachable through an explicit per-turn control. A pending or failed turn never borrows the last successful trace. The supervisor surface shows:

- transcript and language, including `unknown`;
- every scenario with confidence and reason;
- alternatives;
- slots and actions;
- continuation, clarification, handoff, and confirmation-required flags;
- STT, triage, router, response, TTS-first-audio, and total latency.

`null` renders as `—`; numeric values render with `ms` without deriving new latency. Failed turns display the error and never reuse the previous turn's trace.

## Verification

- Vitest covers schema validation, HTTP behavior, stable session use, error mapping, response pairing, `unknown`, and `null` latency.
- React Testing Library covers conversation history, loading/error states, trace rendering, handoff, and confirmation wording.
- Playwright covers a successful text turn and both surfaces at desktop and narrow widths using intercepted test responses.
- A real-backend smoke is reported separately and only as passed if Tim's backend is actually started and answers through the frontend path.
