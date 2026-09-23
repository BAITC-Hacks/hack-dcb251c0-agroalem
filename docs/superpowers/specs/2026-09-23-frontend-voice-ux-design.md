# Frontend Voice UX Design

Status: approved in conversation for written specification on 2026-09-23.

Owner: Danil / frontend.

## 1. Purpose

Build the browser surface that lets a jury member hold a real voice or text conversation with the Voice Router and lets a supervisor understand every backend routing decision.

The frontend succeeds when it:

- records a real microphone utterance and sends it through one integration boundary;
- always provides text input as a fallback;
- presents the assistant text and playable audio when audio is available;
- renders a trace for every completed user turn;
- makes loading, empty, permission, network, contract, and playback failures explicit;
- preserves Russian, Kazakh, and mixed-language content;
- never performs routing or irreversible backend actions itself.

## 2. Constraints and non-goals

Danil owns browser UX, frontend state, microphone capture, playback, trace presentation, and frontend tests.

The frontend does not own:

- LLM routing or scenario selection;
- confidence calculation or thresholds;
- scenario execution;
- STT or TTS providers;
- backend action execution;
- evaluation logic;
- backend endpoint or transport definitions.

No provider secret may be exposed in browser code. No endpoint, audio representation, latency, or successful backend state may be invented while the backend contract remains unknown.

## 3. Selected approach

Use a small React and TypeScript single-page application built with Vite and managed with pnpm.

Supporting choices:

- CSS Modules for component styling;
- a reducer for conversation and voice workflow state;
- React Context only for the shared conversation controller and `TurnClient` dependency;
- Zod validation at the external response boundary;
- a transport-specific client inside the future backend adapter, using native `fetch` only if Tim selects HTTP;
- `MediaDevices.getUserMedia` and `MediaRecorder` for batch microphone capture;
- `HTMLAudioElement` for response playback;
- Vitest and React Testing Library from the first functional milestone;
- Playwright for critical browser journeys;
- MSW only when a network-backed adapter exists and request-level mocking becomes useful.

Next.js is not selected because server rendering and server actions do not help the required local demo flow and would blur the frontend/backend ownership boundary. Frontend-side streaming interaction semantics are deferred until the batch voice UX is measured; the adapter remains transport-neutral and follows Tim's contract if the backend transport itself uses HTTP, WebSocket, or another mechanism.

## 4. System boundary

```text
Customer UI ───────────────┐
Microphone / text fallback │
                           v
                  Conversation Controller
                  UI workflow and history
                           │
                           v
                     TurnClient
              stable frontend integration port
                 ┌─────────┴─────────┐
                 v                   v
        FixtureTurnAdapter   BackendTurnAdapter
          local development    Tim's real transport
                 │                   │
                 └─────────┬─────────┘
                           v
                      TurnResult
             ┌─────────────┼─────────────┐
             v             v             v
      Conversation UI  Supervisor UI  Audio Player
```

`TurnClient` is the only interface used by UI workflow code:

```ts
interface TurnClient {
  submit(input: TurnInput): Promise<TurnResult>;
}
```

`TurnInput` and `TurnResult` follow the domain meanings in `.codex/INTEGRATION_CONTRACT.md`. Frontend types may narrow data into presentation models, but they must not silently rename or reinterpret shared fields.

`FixtureTurnAdapter` returns deterministic contract examples for frontend development. It does not infer scenarios from user text and does not imitate router logic. `BackendTurnAdapter` is added only after Tim documents the real transport, request encoding, response payload, audio delivery, and error semantics. If that transport is HTTP, the adapter may use native `fetch`; the UI and controller do not depend on this choice.

## 5. Module boundaries

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── App.module.css
│   ├── features/
│   │   ├── conversation/
│   │   ├── supervisor/
│   │   └── voice/
│   ├── shared/
│   │   ├── turn-client/
│   │   └── ui/
│   └── test/
├── e2e/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

Responsibilities:

- `app`: dependency composition and responsive two-surface layout;
- `conversation`: draft text, turn history, submit/retry state, and assistant messages;
- `voice`: permission, recording, Blob lifecycle, playback, and media errors;
- `supervisor`: one immutable trace view per user turn;
- `turn-client`: stable port plus fixture and future backend adapters;
- `ui`: small reusable primitives with no business behavior;
- `test`: test setup and contract fixtures.

## 6. UX surfaces

### Desktop

Use one page with the customer conversation as the primary surface and the supervisor trace visible beside it. The default visual proportion is approximately 60/40, adjusted by content rather than hard-coded pixel widths.

The customer surface contains:

- conversation history;
- text composer and submit control;
- microphone start, stop, and cancel controls;
- visible permission, recording, sending, waiting, and playback status;
- assistant text;
- explicit audio play/replay control when audio exists;
- retry paths that do not erase prior successful turns.

The supervisor surface contains a trace card associated with each user turn. It remains secondary visually but must be readable without developer explanation.

Before the first turn, the customer surface shows a concise prompt explaining text and microphone input. The supervisor surface shows an explicit empty state stating that trace data will appear after the first completed turn; it does not display sample routing data as if it were real.

### Narrow screens

Keep the conversation primary and expose supervisor details through a clearly labelled surface switch. Switching surfaces must preserve draft input, scroll position where practical, conversation state, and selected turn.

### Accessibility

- All actions use semantic buttons and keyboard focus.
- Recording state is communicated with text, not color alone.
- Status changes use an appropriate live region without repeatedly announcing full conversation history.
- Focus moves only for user-initiated actions or blocking errors.
- Controls have visible focus and sufficient contrast.
- Long Russian, Kazakh, and mixed-language strings wrap without clipping.

## 7. State and data flow

Conversation state stores immutable per-turn records rather than one global response. Each successful result is attached to the user turn that produced it, preventing a previous trace from being presented as the result of a failed request.

Text flow:

```text
draft -> submit -> pending turn -> TurnClient
      -> validate result -> append assistant response and trace
      -> offer audio playback when audio exists
```

Voice capture flow:

```text
idle
  -> requesting_permission
  -> recording
  -> preparing_audio
  -> awaiting_result
  -> ready
  -> playing (optional)
  -> ready
```

Errors return the relevant workflow to a recoverable state. A failed audio playback does not invalidate the assistant text or trace.

The controller must reject duplicate submits for the same active turn, clean up media tracks after recording, revoke temporary object URLs when replaced or unmounted, and ignore late responses that no longer match the active request.

## 8. Trace presentation

After every completed user turn, render backend-provided values for:

- transcript;
- language: `ru`, `kk`, or `mixed`;
- selected scenario or scenarios;
- confidence;
- concise operational reason;
- alternatives;
- slots;
- actions;
- continuation state;
- clarification state;
- handoff state;
- STT, triage, router, response, TTS-first-audio, and total latency.

Project architecture also requires scenario/backend execution timing, but the current shared contract has no accepted field for that stage. The frontend requests a jointly reviewed canonical field and treats this timing as unavailable until the contract supplies it; it does not invent a field name or derive a fake duration.

Missing values render as unavailable, for example `—`. Missing latency must never render as `0`. The UI displays concise backend evidence, not hidden chain-of-thought. Multiple scenarios are rendered as separate entries rather than flattened into one label.

## 9. Failure behavior

The UI distinguishes:

- microphone permission denied;
- missing or unavailable input device;
- unsupported recording API or MIME type;
- recording failure;
- network or backend failure;
- malformed contract response;
- response timeout when defined by the real adapter;
- audio playback rejection or decode failure.

For each failure, the UI states what failed, preserves valid prior turns, and offers the smallest safe recovery such as retry, text fallback, or manual play. It never displays a fabricated successful trace.

## 10. Audio handling

Before recording, the voice module checks browser support and selects only a MIME type accepted both by the browser and Tim's documented backend contract. It does not hardcode a codec before that contract exists.

Captured audio is held only as long as needed for submission unless a deliberate debug mode is introduced later. Microphone tracks are stopped on finish, cancel, failure, and unmount.

Assistant audio is normalized by the adapter into a source the audio player can consume. Autoplay is not assumed because browsers may block it. The user always retains an explicit play/replay control, and assistant text remains visible if audio is missing or fails.

## 11. Testing strategy

Development follows test-driven development per functional slice: failing behavior test, minimum implementation, then refactor while green.

Unit and component coverage includes:

- initial customer and supervisor empty states without fabricated trace data;
- normal text turn and duplicate-submit prevention;
- immutable conversation history;
- one-scenario and multi-scenario traces;
- alternatives, slots, actions, and missing latency;
- malformed adapter response;
- permission denial and unavailable microphone;
- recording cleanup;
- backend/network failure and retry;
- playback failure with retained text;
- clarification, handoff, and confirmation presentation;
- long Russian, Kazakh, and mixed-language content.

Playwright covers the real browser-critical paths:

- text conversation and trace update;
- microphone permission denial;
- recording controls with a supported browser fixture;
- responsive customer/supervisor navigation;
- keyboard operation of primary controls.

Every implementation commit must pass the frontend's documented format, lint, type-check, unit/component test, relevant Playwright, and build commands. Commands are recorded only after the scaffold makes them real.

## 12. Delivery sequence

1. Scaffold React, TypeScript, Vite, pnpm, quality commands, and the minimal two-surface shell.
2. Add domain-derived frontend types, Zod boundary validation, `TurnClient`, and `FixtureTurnAdapter`.
3. Deliver text conversation and per-turn supervisor trace.
4. Deliver microphone capture with the complete permission/recording cleanup state machine.
5. Deliver assistant audio playback and text-preserving failure behavior.
6. Add `BackendTurnAdapter` from Tim's documented transport, switch the default demo path to it, and run real text, microphone, trace, and response-audio integration tests.
7. Complete the runnable P0 path, one-command launch, and required browser checks before allowing P1 work to displace it.
8. Deliver clarification, handoff, and confirmation UX after the P0 gate passes.
9. Complete the final responsive/accessibility review and remaining critical Playwright coverage.

Each coherent target receives verification, a state update, an atomic commit, and a push to `origin/danil/frontend`. Danil does not merge the branch into `main`.

## 13. Acceptance criteria

- The application launches through documented commands from a clean install.
- A user can submit text and see the assistant response and matching trace.
- A supported browser can record a microphone utterance and release the device afterward.
- Permission, device, network, malformed-response, and playback failures are recoverable.
- Assistant audio can be played when the backend provides a valid source.
- During development, contract fixtures may drive UI and component tests but must be clearly isolated from the demo path.
- For submission readiness, the default demo path uses the real backend adapter; fixtures remain limited to tests and explicit local development.
- Real backend trace values update per turn in the default demo path.
- Unknown values are visibly unavailable rather than fabricated.
- Customer and supervisor surfaces work on desktop and narrow layouts.
- Russian, Kazakh, and mixed-language strings remain readable.
- Automated checks and build pass before each milestone is pushed.

## 14. Backend integration dependency

The design can proceed through fixture-backed UI without a real endpoint. Real integration waits for Tim to document:

- endpoint and transport;
- text request encoding;
- microphone audio request encoding and accepted MIME types/codecs;
- response schema and error status semantics;
- `assistant_audio` representation, content type, and streaming or complete-response behavior;
- a jointly reviewed canonical field for scenario/backend execution latency;
- timeout, cancellation, and stale-response behavior;
- representative success, clarification, handoff, confirmation, malformed, and failure payloads.

Any shared field change follows `.codex/INTEGRATION_CONTRACT.md` and requires both roles to review it.

The canonical machine-readable exchange schema will belong in the repository-root `shared/contracts/` after Tim and Danil review its format. Frontend-local `TurnClient` models are consumption and presentation types, not a second source of truth. When the canonical schema exists, frontend validation must be generated from it or covered by a contract test that detects divergence.
