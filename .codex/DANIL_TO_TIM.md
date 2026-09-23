# DANIL_TO_TIM.md

Owner/writer: Danil.
Reader: Tim.

Use this file for frontend -> backend handoffs and contract requests. Keep newest handoff at the top.

## 2026-09-23 — Saqta reference UI verified; voice MVP dependency remains

Frontend commit: the commit containing this handoff (`git log -1 --oneline`). Branch: `danil/frontend`.

Ready:
- user-referenced light Saqta conversation/trace UI, implemented as React/CSS rather than screenshots;
- every scenario's ID, reason, and confidence in its own card;
- transcript, `unknown`, exact clarification/handoff/confirmation/continuation flags, nullable timings, slots/actions;
- mobile shared conversation/trace scrolling above a non-overlay composer, including 320/360 px and 200% text;
- long-history reply visibility, historical trace navigation, empty/pending/error/retry states, and disabled empty send.

Evidence (test responses): `pnpm check` passes format, lint, typecheck, 21 Vitest checks, 23 transport checks, and build. `pnpm test:e2e`: 11 passed, 5 intentionally skipped. `pnpm peers check`: no issues. Independent code review found a new-message scrolling issue; it was reproduced in a failing browser test and fixed.

Evidence (real local backend, no interception): Tim's published `ce761bd` in an isolated checkout passed one browser → Vite proxy → backend → OpenAI → UI/trace success. A separate run without provider credentials passed one genuine `503` browser test with no fixture or stale trace. This addresses the successful/failed-turn request in PR #2's comment; it does not establish cross-computer connectivity.

MVP is not yet complete. Please publish:
1. Voice endpoint and request encoding, accepted MIME/codec, size/duration limits, session/turn semantics, timeout/cancel/error behavior.
2. The transcript + trace response and assistant-audio representation (URL/blob/base64/stream), MIME type, lifetime/auth/CORS requirements, and representative success/failure payloads.
3. A runnable STT/router/TTS path and backend address for live RU/KK/mixed-language smoke.

Frontend can prepare microphone permission/record/stop/cancel and local playback independently. It will not invent an endpoint or treat recorded local audio as a completed voice turn. Scenario execution and actual operator connection are not claimed by the status labels. Backend, common contract, `main`, and Tim's branch were not modified.

Git audit: `origin/tim/backend=ce761bd`, voice still UNKNOWN; PR #2 remains draft and reported not mergeable. Merge resolution and repository-level launcher remain integrator-owned. No merge was performed.

---

## 2026-09-23 — FIRST REAL TEXT E2E UI verified on Danil PC

Frontend commit:
`the commit containing this handoff; resolve with git log -1 --oneline`

What is ready:
- locked React/TypeScript/Vite frontend with format, lint, type-check, unit, browser, and build commands;
- stable-session customer text conversation with pending, success, error, and retry states;
- real `HttpTurnClient` for `POST /v1/turn/text`, Zod response validation, same-session enforcement, a bounded wait, cancellation, and explicit `422`/`502`/`503`/`504` handling;
- one selectable supervisor trace per completed reply, including every published field; pending/failed turns cannot display stale success data;
- correct `unknown` and nullable-latency rendering;
- `requires_confirmation` shown as a requirement, never as an executed action;
- desktop and 360 px layouts verified without horizontal overflow.

Automated test-response evidence:
```powershell
Set-Location frontend
pnpm check
pnpm test:e2e
```

- 21 Vitest contract/component/regression checks and 23 transport/trace-selection checks pass;
- intercepted Playwright success and failure checks pass on desktop and 360 px;
- build and dependency peer checks pass.

Real backend evidence (not fixture/interception):
- inspected and ran current `origin/tim/backend` commit `ce761bd` from an isolated detached checkout;
- current backend suite on Windows: 63 passed, 1 failed in `test_atomic_write_creates_parent_and_preserves_unicode` because the test reads UTF-8 JSON through the platform default encoding; no backend file was changed from this branch;
- health: `ok`, 40 business scenarios, 3 system intents;
- direct text smoke: RU input routed to `SC11`, with measured router/total latency and `null` STT/TTS timing;
- real Playwright browser → Vite proxy → current Tim backend → OpenAI router → merged UI trace smoke: `1 passed`.

Backend dependency:
- text contract is sufficient and verified end to end;
- publish the voice upload request and assistant-audio response contract before Danil begins backend audio integration.

Known limitations:
- voice/STT/TTS are not implemented in frontend;
- backend scenario execution is not implemented, so `actions=[]` is expected;
- the real router smoke was functionally correct but exceeded the project latency target;
- Tim still owns the full 104-utterance baseline and integration into `main`.

---

## 2026-09-23 — FIRST REAL TEXT E2E UI code ready

Frontend commits:
- scaffold: `5ef09a3cb4d6fec4a5b3f37a3a40a97581471bab`
- text UI: `ce7c0e6a3f81192aed5b8e5f891d4f830d56efc8`

What is implemented in code:
- React + TypeScript + Vite + pnpm frontend;
- customer text input and immutable conversation exchanges;
- real `HttpTurnClient` for `POST /v1/turn/text`;
- Zod validation of Tim's response contract;
- loading and backend error presentation;
- supervisor trace for routing data and real/missing latency;
- component test for a successful text turn and trace;
- Vite dev proxy `/api -> http://127.0.0.1:8000`.

Verification still required on Danil PC:
```powershell
cd frontend
pnpm install
pnpm check
pnpm dev
```

Then run one real request against Tim backend and record the evidence.

Backend dependency:
- text contract is sufficient for this milestone;
- voice contract is still not required.

Known limitation:
- no claim is made yet that dependencies installed, build passed, or browser-to-backend E2E passed. Those require Danil's local runtime.

---

## 2026-09-23 — Frontend architecture selected

Frontend commit:
`the commit containing this handoff; resolve with git log -1 --oneline`

What is ready:
- written frontend design reflecting the conversation-approved architecture at `docs/superpowers/specs/2026-09-23-frontend-voice-ux-design.md`, pending document review;
- React, TypeScript, Vite, pnpm, CSS Modules, reducer-driven workflow state, and a `TurnClient` adapter boundary selected;
- the design isolates future fixture-backed UI work from backend transport and routing behavior.

Backend dependency / contract request:
- text endpoint and request encoding are satisfied by Tim's published `POST /v1/turn/text` contract;
- provide accepted microphone MIME types/codecs and `assistant_audio` delivery semantics;
- document timeout, cancellation, stale-response, and error behavior with representative payloads.

Observed payload/runtime evidence:
- no real frontend or backend payload exists yet;
- the design consumes the existing domain meanings without changing `.codex/INTEGRATION_CONTRACT.md`.

How to reproduce:
```powershell
Get-Content -Raw docs\superpowers\specs\2026-09-23-frontend-voice-ux-design.md
git diff HEAD^ -- .codex\INTEGRATION_CONTRACT.md
```

Known limitation:
- this milestone is design-only; no dependencies, frontend runtime, fixture adapter, or UI exist yet.

---

## 2026-09-23 — Server-only provider credential boundary verified

Frontend commit:
`the commit containing this handoff; resolve with git log -1 --oneline`

What is ready:
- local ignored `.env.local` contains usable OpenAI and NVIDIA provider credentials without browser-public prefixes;
- both credentials passed read-only authentication checks against their official hosted API endpoints;
- frontend ownership is explicitly limited to microphone capture, backend transport, and audio playback, with no provider secret access.

Backend dependency / contract request:
- keep OpenAI routing and NVIDIA STT/TTS provider calls in server-side adapters;
- define the real audio upload/stream and response-audio transport before frontend integration;
- add a tracked `.env.example` with variable names only when the backend runtime is scaffolded; never include secret values.

Observed payload/runtime evidence:
- no application manifest, frontend/backend source tree, provider adapter, endpoint, or dev server exists yet;
- no direct provider API call or public-prefixed provider credential reference exists in tracked repository content.

How to reproduce:
```powershell
git check-ignore -v -- .env.local
rg --files -g 'package.json' -g 'src/**' -g 'frontend/**' -g 'backend/**'
rg -n --hidden -g '!.git/**' -g '!.env*' -g '!starter-kit/**' '(VITE_|NEXT_PUBLIC_|PUBLIC_).*(KEY|TOKEN)'
```

Known limitation:
- the server-side STT/TTS provider and transport contract are not implemented, so frontend voice integration remains blocked on Tim's backend handoff.

## 2026-09-23 — Phase 0 frontend audit

Frontend commit:
`the commit containing this handoff; resolve with git log -1 --oneline`

What is ready:
- verified frontend/voice/trace starting-state audit;
- confirmed that no frontend application, dependency manifest, build scripts, tests, or browser integrations exist yet;
- confirmed the domain-level integration contract is the only available frontend/backend boundary.

Backend dependency / contract request:
- provide the real backend transport and endpoint after Tim's Phase 0 audit;
- document the accepted request format for text and microphone audio;
- document `assistant_audio` delivery semantics, including representation, MIME type/codec, streaming or complete-response behavior, and audio-specific failure handling;
- provide one representative success response plus clarification, error, and stale/timeout behavior without changing agreed domain field meanings silently.

Observed payload/runtime evidence:
- no application payload or runtime response exists yet;
- `.codex/INTEGRATION_CONTRACT.md` intentionally leaves transport and endpoints unspecified.

How to reproduce:
```powershell
rg --files --hidden -g '!.git/**' -g '!.env*'
rg --files -g 'package.json' -g 'pnpm-lock.yaml' -g 'src/**' -g 'app/**' -g '*.tsx' -g '*.jsx'
```

Known limitation:
- frontend architecture and UX are not yet selected or designed, so Danil will not scaffold or guess the backend adapter until the design step is completed.

---

## 2026-09-23 — Shared repository bootstrap

Frontend commit:
`the commit containing this handoff; resolve with git log -1 --oneline`

What is ready:
- official Codex instruction packs;
- untouched official starter-kit files under `starter-kit/`;
- source case document and engineering requirements;
- branch ownership, persistent memory, integration-contract draft, and commit protocol.

Backend dependency / contract request:
- review and integrate the shared bootstrap into `main`;
- perform Tim Phase 0 audit before selecting backend stack or endpoints.

Observed payload/runtime evidence:
- no application payload exists yet;
- official JSON references validate without missing scenario, slot, action, or expected IDs.

How to reproduce:
```bash
python -m py_compile starter-kit/evaluate.py
```

Known limitation:
- no application stack, endpoint, router, UI, dependencies, or measured evaluation result exists yet.

---

## Template

### YYYY-MM-DD HH:MM — <short title>

Frontend commit:
`<sha>`

What is ready:
- ...

Backend dependency / contract request:
- ...

Observed payload/runtime evidence:
- ...

How to reproduce:
```bash
...
```

Known limitation:
- ...

---

No handoffs yet.
