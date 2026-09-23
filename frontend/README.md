# Voice Router frontend

Owner: Danil/frontend.

## Stack

- React 19.3
- TypeScript 5.9
- Vite 8.3
- pnpm 11
- CSS Modules
- Zod
- Vitest + Testing Library
- Playwright
- ESLint + Prettier

## Install

```powershell
Set-Location frontend
pnpm install
```

The committed `pnpm-lock.yaml` is the reproducible dependency source.

## Run against Tim backend

Start the backend from a separate `tim/backend` checkout on its documented default port (this frontend branch does not contain `backend/` or the launcher):

```powershell
py run_mvp.py
```

```powershell
Set-Location frontend
pnpm dev
```

Vite proxies the frontend API boundary:

```text
/api/v1/turn/text -> http://127.0.0.1:8000/v1/turn/text
```

For a deployed API, copy `.env.example` to an ignored local env file and set:

```text
VITE_API_BASE_URL=https://your-backend.example
```

This value is a URL, not a secret. Never put provider API keys in a `VITE_` variable.

## Verify

Run all static and unit/build checks:

```powershell
pnpm check
```

Run browser tests with intercepted deterministic responses at desktop, 360 px, 320 px, and 200% text:

```powershell
pnpm test:e2e
```

With Tim's real backend already running, opt in to the real browser-to-backend smoke:

```powershell
$env:REAL_BACKEND="1"
pnpm exec playwright test e2e/real-backend.spec.ts --project=desktop-chromium
```

To test a genuine unavailable-provider error, use an isolated backend checkout without provider credentials or provider env files, stop any credentialed test server, and opt in separately:

```powershell
Remove-Item Env:REAL_BACKEND -ErrorAction SilentlyContinue
$env:REAL_BACKEND_FAILURE="1"
pnpm exec playwright test e2e/real-backend.spec.ts --project=desktop-chromium
Remove-Item Env:REAL_BACKEND_FAILURE
```

Do not remove a developer's saved credential file to run this check. Both live tests are skipped by default, so ordinary frontend checks never consume provider quota or require a secret. `127.0.0.1:8000` refers to the computer running Vite; these checks do not prove connectivity to Tim's separate computer.

## Current milestone

Implemented text and voice UI (live provider evidence is recorded separately below):

- stable-session text input and conversation history;
- real `HttpTurnClient` for Tim's `POST /v1/turn/text`;
- runtime response validation with Zod;
- loading, cancellation, bounded-wait, and backend error states;
- selectable per-turn supervisor trace with all published fields and no stale-trace reuse;
- response-session validation and protection from late responses;
- `unknown` language and nullable latency rendering;
- explicit confirmation-required wording that does not claim an action ran;
- light Saqta Insurance reference layout with semantic message cards;
- confidence and reason inside each scenario's own card;
- explicit API-driven clarification, handoff, confirmation, and continuation state rows;
- desktop side-by-side surfaces and mobile conversation/trace scrolling above a pinned, non-overlay composer;
- empty/whitespace send lockout and large-text responsive layout.

The microphone button now requests browser permission on click. Record up to 60 seconds, then choose **Остановить и отправить**, or cancel without sending. Browser MediaRecorder selects WebM/Opus or MP4; unsupported browsers and permission errors retain text fallback. The microphone is released after stop/cancel/error/unmount, including a delayed permission response.

Audio uses Tim's published v0.2 contract through `AudioApiClient`: `/v1/turn/audio` shares the text session, validates the returned trace, and attaches transcript/answer/MP3 to its own exchange. Native audio controls play only on request, with an AI-voice disclosure. If TTS fails, the completed text and trace remain; **Повторить озвучку** sends only `/v1/audio/speech`. Text replies can also be explicitly synthesized. Cancellation stops waiting, not necessarily server execution.

Microphone access needs localhost or HTTPS and browser/OS permission. No provider credentials or fixture fallback are present in the frontend. `pnpm check` now includes the 16 audio transport tests.

Opt-in paid synthetic-speech test against a running real backend (not acceptance of a physical microphone, Kazakh, or mixed speech):

```powershell
$env:REAL_VOICE="1"
pnpm exec playwright test e2e/real-voice.spec.ts --project=desktop-chromium
Remove-Item Env:REAL_VOICE
```

This test generates non-personal RU speech using real TTS, supplies it to real browser MediaRecorder through WebAudio, sends it through the real STT/router/TTS API, and checks actual audio playback. It does not intercept API responses. Default browser tests use explicit test responses and a simulated microphone; they never call OpenAI.

See [AUDIO_HANDOFF.md](AUDIO_HANDOFF.md) and the [root README](../README.md) for current branch-specific status and setup. Full-generation `tts` must not be substituted for unavailable `tts_first_audio`. If only synthesis fails, preserve the successful transcript/text/trace and retry only speech.
