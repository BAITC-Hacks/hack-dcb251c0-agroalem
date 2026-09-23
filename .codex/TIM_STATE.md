# Tim state

Role: backend and integration owner. Branch: tim/backend.
Updated: 2026-09-23. Execution environment: isolated Linux container, not either Windows PC.

## Latest synchronization and Windows regression fix

- Backend text/audio implementation was published in ef2a710492a5af46ccda01b5eb51b64173b62f6b.
- While publishing frontend helpers, Danil advanced first to 1b41b22 and then to fcb9efbe4fa5d4b37ec0ef37f9469b26c1ff4b9f. His reference-driven UI, lockfile and tests were preserved. The rejected non-fast-forward attempt was not forced; the audio transport was rebuilt on his latest commit and published as b3f0982b1bbf0e4cd4c3760d8244cc8ef7f43049.
- Danil's committed state at 1b41b22 reports a successful real browser text smoke against the older backend ce761bd, plus frontend build and tests. This is Danil's evidence for that source pair, not validation of the new grounded-answer/audio pipeline.
- Danil reported 63 passed / 1 failed in a Windows backend run: the test read a UTF-8 JSON file with the platform default encoding. This target makes text I/O explicit UTF-8 throughout test_baseline_regressions.py. It does not change writer semantics, expected labels, routing thresholds or benchmark results.
- Two focused copied-writer/encoding checks were executed locally: 2 passed in 0.10s. One reproduces the wrong cp1251 decoding and verifies explicit UTF-8 decoding. These are not a Windows full-suite rerun.

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

Chromium/Playwright navigation to the temporary local test server failed with ERR_BLOCKED_BY_ADMINISTRATOR. Zero browser E2E checks were completed in this isolated session. Browser policy was not changed; the temporary server was stopped.

## Unverified and not claimed

- No live OpenAI calls were made by this integration session; no OPENAI_API_KEY was present here. Danil separately records live text verification on the older backend as described above.
- No 104-item baseline, STT/TTS quality score or live latency benchmark exists from this session.
- The 46 new server tests are not the entire repository suite. Legacy API test doubles were updated for the grounded-answer dependency, but the full suite against the complete official files still needs an authorized clone.
- Full frontend pnpm install/check/build was not executed by this integration agent; Danil's published checks are separately attributed. No lockfile was invented or overwritten.
- No local Windows files or private ignored .env files were inspected or changed here.
- No additional AI agents or remote-desktop sessions were launched; the relevant integrations are not connected.

## Deliberate MVP boundary

Read-only insurance consultation and scenario routing only. No actual policy/claim mutations, SMS, appointment execution, operator connection or complete confirmation executor. actions stays []. README must not claim otherwise. No public-production deployment, authentication or durable multi-worker state.

## Synced inputs

Backend implementation base: ce761bd4ce356db4ae1d074fde806be6f9ebb692.
Latest published backend implementation: ef2a710492a5af46ccda01b5eb51b64173b62f6b.
Latest frontend parent preserved: fcb9efbe4fa5d4b37ec0ef37f9469b26c1ff4b9f.
Actual code commit for this entry is the commit containing this file; resolve with `git log -1 -- .codex/TIM_STATE.md` rather than inventing a self-referential SHA.

## Next exact gate

On a full authorized checkout with the ignored OpenAI key configured: run `py run_mvp.py --check`, then `.venv\Scripts\python.exe -m backend.scripts.run_baseline`. Record actual model, source SHA, metrics and failures. Start `py run_mvp.py`; verify one successful and one failed browser text request, one microphone request and speech playback against the NEW backend. Resolve integration conflicts only with these results visible. Do not claim main/release readiness from a fixture test or mergeable PR alone.

## README reconciliation: 2026-09-23

Documentation-only target requested by Tim before researching alternative speech providers.

- Re-read requirements, current README, launcher and both roles' published state at backend aa864a2 and frontend b3f0982.
- Rewrote the root README with a requirement/implementation/verification matrix. A text-only UI does not complete the mandatory voice case.
- Attributed Danil's successful and failed live text checks to backend ce761bd; did not count them as acceptance of the new audio/answer pipeline.
- Preserved runnable setup, model settings, API/error semantics, evaluator commands, jury instructions and read-only limitations.
- Distinguished the organizer-provided HackAlem Sandbox workspace invitation from API project access and from offline model execution. No offline model deployment is present.
- Checked the generated README for valid UTF-8, balanced fenced code blocks and absence of secret-shaped API keys. Its Git blob is 81e021e0a7c6af1e18dd40e4111464f5e8277e8a.
- No application tests, live provider calls, local Windows configuration changes, key installation, model/provider switch or merge were performed by this documentation target. Existing runtime evidence above remains historical and unchanged.

Next work remains the live acceptance gate above. Any NVIDIA option must first be checked for RU/KK/mixed coverage and deployment requirements; it is not enabled by editing documentation.
