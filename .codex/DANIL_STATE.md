# DANIL_STATE.md — Danil/frontend persistent memory

Owner: Danil. Branch: `danil/frontend`. Updated: 2026-09-23.

## Last completed target

Connected the approved reference-driven React UI to Tim's published v0.2 audio contract. User explicitly approved microphone → existing OpenAI backend → answer/trace/player and requested commit/push. No backend implementation, common contract, Tim branch, or main was changed or merged.

## Implemented

- `VoiceRecorder`: explicit user-click permission, WebM/Opus or MP4, stop/send, cancel, permission/device/format errors, 60-second automatic stop/send, 20 MiB bound. All tracks and timers released on stop/cancel/error/unmount, including delayed permission responses.
- `AudioApiClient.submitVoice` sends multipart `/v1/turn/audio`; voice and text share a session. Returned trace is validated with Zod and linked to its own exchange. Failed/pending turns never borrow previous trace. No fixture fallback.
- Transcript from the API replaces the pending voice label; failed voice input remains available for an explicit retry. Completed turns release the input Blob.
- `VoicePlayer`: explicit native MP3 playback, AI-voice disclosure, bounded base64 decoding, object-URL cleanup, loading/cancel/errors. Failed TTS preserves successful transcript/answer/trace; retry calls only `/v1/audio/speech`. Text answers may also be explicitly synthesized.
- Optional `latency_ms.tts` is rendered as full-generation duration, not `tts_first_audio`. Unknown timings remain `—`; no timing/confidence/scenario inference in frontend.
- Existing Saqta desktop/mobile text/trace layout retained, including trace scroll above non-overlay composer. Recording locks conflicting text submits; stop/cancel stay accessible.
- Audio transport tests now run inside `pnpm check`; inherited transport formatting is corrected. Test outputs, local credentials and dependencies remain ignored.

## Verification evidence

Commands run from `frontend/`:

```powershell
pnpm check
pnpm test:e2e
$env:REAL_VOICE="1"
pnpm exec playwright test e2e/real-voice.spec.ts --project=desktop-chromium --output=test-results-live-voice
Remove-Item Env:REAL_VOICE
```

- Format, ESLint, TypeScript and production build passed.
- Vitest: 52 tests passed, including the final changed-answer-during-synthesis regression.
- Text transport: 23 passed; audio transport: 16 passed, all controlled responses.
- Default Playwright: 15 passed, 7 intentionally skipped (six opt-in live cases and desktop duplicate of mobile geometry). Includes native Chromium fake-device recording, denied permission, shared voice/text session, TTS-only retry, and 320/360 px/200% text regressions.
- Real provider browser test: **1 passed**, backend `95eca20c5648896f1e326e69992b6da9b331f3fa`, no API interception. Real TTS generated synthetic non-personal RU input, WebAudio supplied it to real MediaRecorder, then real STT → LLM routing/answer → TTS → browser MP3 playback completed. Transcript and trace displayed; language `ru`, scenario `SC11`.
- One measured live run: STT 980.26 ms, router 2604.57 ms, response 3172.07 ms, full TTS 4608.44 ms, server total 11367.61 ms. `tts_first_audio=null`. This is one smoke measurement, not a benchmark or SLA claim.
- First live attempt got 502 because a subagent-owned backend process ended; relaunched the same published source in the root runtime and reran successfully. No backend code fix was needed.
- Independent read-only code review found no blocking defects. Physical microphone, Safari/MP4 and broader recognition acceptance remain separate gates.

## Local runtime

- Frontend: `http://127.0.0.1:5173/`; Vite proxies `/api` to `127.0.0.1:8000`.
- Backend runs from a separate clean detached checkout `../danil-ui-backend-check` at published `95eca20`; no backend files were copied into this branch. Server suite: 110 passed; dependency check passed.
- Existing user-authorized OpenAI key is loaded server-side only from ignored local configuration. No credentials were committed. `/health` reports configured, but its static `provider_live_verified=false` is not a substitute for the separate live test evidence.

## Boundaries and remaining gates

- Not a complete hackathon acceptance: physical mic on the user's device, Safari, real RU/KK/mixed conversations, topic changes and routing baseline still need verification. User explicitly requested no Kazakh/mixed testing for this delivery; none was run. No 104-utterance accuracy claim.
- Batch audio, no streaming; latency targets are not met by the measured smoke. Do not relabel full-generation time as first-heard audio.
- `actions=[]` means no insurance operation ran; `requires_confirmation` is a scenario requirement; handoff does not establish a real operator connection.
- Tim owns backend optimization, evaluation and final integration into main. Public HTTPS judge hosting, quota/access protection, and one-command combined React/backend launch remain open.
- Historical text UI live evidence (`fcb9efb` against backend `ce761bd`) remains in previous commits; the new live synthetic-RU evidence above is for the current audio milestone.

## Next exact target

User manual check: reload local site, click Начать запись, grant permission, speak, click Остановить и отправить, then play the assistant audio. Follow with RU/KK/mixed acceptance and judge deployment once hosting is selected. Commit and push only verified Danil changes; never force-push or merge another role's branch.
