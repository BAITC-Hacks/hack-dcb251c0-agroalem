# Tim state

Role: backend and integration owner. Branch: tim/backend.
Updated: 2026-09-23. Execution environment: isolated Linux container, not either Windows PC.

## Current objective

Finish the live acceptance gates of the text + OpenAI audio jury demo. Keep routing tuning behind the first measured 104-item baseline. Danil owns the reference-driven visual layout; do not redesign his React UI in parallel.

## Completed code target

- Added OpenAI-only HTTPX REST transport for strict Responses JSON schema, file transcription and MP3 speech. The key stays server-side and the provider origin is fixed to api.openai.com.
- Added a real read-only answer-generation layer grounded in official knowledge_base.json, accepted scenarios, collected values and the latest ten user+assistant turns. It replaces repeated scenario openings on accepted business routes.
- Retained original routing prompt and confidence thresholds. The old unverified default model was replaced with documented, configurable gpt-4.1-mini; this is configuration repair, not a measured tuning result.
- Added rollback/serialization and bounds for process-local session state.
- Added /v1/audio/transcriptions, /v1/audio/speech and /v1/turn/audio. Failed TTS preserves an already successful text turn. Unknown first-audio timing remains null; full generation time uses tts.
- Added a functional jury page at / with text, per-turn trace, microphone recording, file upload, MP3 playback, cancellation and explicit AI-voice disclosure.
- Added root run_mvp.py: local venv/install/server launch, with no Git changes and no secret output. Added .venv to .gitignore.
- Replaced the root README with actual startup/use/demo/API/testing instructions and explicit limitations.
- Added transport-only audio helper on Danil's branch; his design/layout files were not edited in this target.

## Evidence actually executed

`python -m pytest backend/tests/test_mvp_runtime.py -q`: 46 passed in 2.00s, using explicit unit fixtures and HTTPX MockTransport.

`NODE_PATH=/usr/local/slides_js/node_modules node --test frontend/scripts/audio.check.mjs` (run from the appropriate directory): 16 passed, 0 failed; actual TypeScript source transpiled with the environment's compiler and controlled fetch fixtures.

Strict standalone TypeScript check of audio.ts: exit 0. `python -m compileall` for changed Python and `node --check backend/web/app.js`: exit 0.

Chromium/Playwright navigation to the temporary local test server failed with ERR_BLOCKED_BY_ADMINISTRATOR. Zero browser E2E checks were completed. Browser policy was not changed; the temporary server was stopped.

## Unverified and not claimed

- No live OpenAI calls were made; no OPENAI_API_KEY was present here.
- No 104-item baseline, STT/TTS quality score or live latency benchmark exists from this session.
- The 46 new server tests are not the entire repository suite. Legacy API test doubles were updated for the grounded-answer dependency, but the full suite against the complete official files still needs an authorized clone.
- Full frontend pnpm install/check/build was not executed; no lockfile was invented.
- No local Windows files or private ignored .env files were inspected or changed.
- No additional AI agents or remote-desktop sessions were launched; the relevant integrations are not connected.

## Deliberate MVP boundary

Read-only insurance consultation and scenario routing only. No actual policy/claim mutations, SMS, appointment execution, operator connection or complete confirmation executor. actions stays []. README must not claim otherwise. No public-production deployment, authentication or durable multi-worker state.

## Synced inputs

Backend base: ce761bd4ce356db4ae1d074fde806be6f9ebb692.
Frontend base inspected: 723a88189d4529c981bf28dabe54ec1ebd0703c4.
Actual code commit for this entry is the commit containing this file; resolve with `git log -1 -- .codex/TIM_STATE.md` rather than inventing a self-referential SHA.

## Next exact gate

On a full authorized checkout with the ignored OpenAI key configured: run `py run_mvp.py --check`, then `.venv\Scripts\python.exe -m backend.scripts.run_baseline`. Record actual model, source SHA, metrics and failures. Start `py run_mvp.py`; verify one successful and one failed browser text request, one microphone request and speech playback. Resolve integration conflicts only with these results visible. Do not claim main/release readiness from a fixture test or mergeable PR alone.
