# Tim -> Danil: working text and OpenAI audio contract

2026-09-23. Latest user direction: OpenAI for every AI provider call; Danil is preparing visual references and owns interface layout/components/buttons. No need for a new architecture approval loop.

## What you can use

Backend code on origin/tim/backend now includes:
- POST /v1/turn/text with a grounded answer, not only a scenario opening;
- POST /v1/audio/transcriptions (multipart file -> text and measured duration);
- POST /v1/audio/speech (JSON text -> binary MP3);
- POST /v1/turn/audio (multipart session_id, file, include_audio -> text-turn result with optional MP3 base64).

Read the precise contract without merging all backend work:

```bash
git fetch origin
git show origin/tim/backend:.codex/INTEGRATION_CONTRACT.md
```

A functional built-in page at backend / is supplied for jury fallback. It is not a replacement direction for your reference-driven React design.

## Changes supplied to your branch

`frontend/src/shared/turn-client/audio.ts`: AudioApiClient.transcribe, synthesize and submitVoice. No provider keys and no direct OpenAI calls from the browser. Apply your existing turnResultSchema to the returned voice trace before rendering. The existing text adapter deadline becomes 120 seconds to allow routing plus answer generation.

`frontend/scripts/audio.check.mjs`: standalone transport tests. 16 fixture tests executed successfully in the integration environment; this is not a full React/Vitest/build run.

No App.tsx, CSS, reference specification, package versions or lockfile was replaced in this target.

## Your next target

Implement the approved visual layout and connect the supplied clients. Preserve per-turn trace selection, errors, keyboard access and duplicate-submit guards. Add microphone start/stop/cancel, track cleanup, explicit playback, object-URL cleanup and visible AI-voice disclosure. Use only WebM/MP4 formats supported by both MediaRecorder and the contract, or file upload/text fallback. The built-in app.js can be inspected as a functional reference, not copied as a new visual style requirement.

Show slots, actions and clarification/handoff/confirmation flags. Unknown timings are null; optional tts is full generation time, not first-audio latency. actions=[] means no insurance operation executed. If TTS fails, keep the successful text/trace and repeat only speech on explicit request.

Run your actual pnpm install/check/build, record the real lockfile and commands in DANIL_STATE, and verify browser requests against a running backend. Do not claim that the integration-agent fixture tests were executed on your workstation.

## Remaining shared gate

A live routing baseline and a complete live browser flow are still required. No key was available to this integration session; Chromium navigation was blocked by local policy. Final main integration must not be labelled verified before those checks. Keep working in your branch; do not force-push or absorb backend changes just to read this handoff.
