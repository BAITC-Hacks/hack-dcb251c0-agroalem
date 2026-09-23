# TASKS.md

## P0 — submission blockers

- [x] Inspect official starter-kit README and schemas.
- [x] Verify all original 40 scenarios load correctly.
- [ ] Implement browser microphone capture.
- [ ] Implement STT adapter.
- [ ] Implement LLM router with structured output.
- [ ] Validate returned scenario IDs.
- [ ] Build conversation state for multi-turn context.
- [ ] Implement scenario execution against official KB/mock backend.
- [ ] Implement response generation.
- [ ] Implement TTS/audio playback.
- [x] Implement text fallback. (Danil: verified local browser-to-backend text path.)
- [x] Implement supervisor trace panel. (Danil: per-turn text trace.)
- [x] Show scenario + short rationale + alternatives after every turn. (Danil: each successful text response; failed turns show unavailable trace.)
- [x] Show real stage latency. (Danil: published API values only; unavailable stages remain `—`.)
- [ ] Verify Russian.
- [ ] Verify Kazakh.
- [ ] Verify mixed-language speech.
- [ ] Run official `evaluate.py`.
- [ ] Add reproducible automated tests.
- [ ] Create one-command launch.
- [ ] Replace all README setup placeholders with real commands.

## P1 — robustness and score

- [x] Match Saqta frontend references and keep mobile trace reachable above the composer at 320/360 px and 200% text. (Owner: Danil; branch: `danil/frontend`; evidence: frontend Playwright checks.)

- [ ] Add uncertainty gate.
- [ ] Add clarification flow.
- [ ] Add operator handoff with conversation context.
- [ ] Add confirmation gate for irreversible actions.
- [ ] Improve close-scenario boundary handling.
- [ ] Add topic-switch regression tests.
- [ ] Add context-dependent follow-up tests.
- [ ] Measure and reduce routing latency.
- [ ] Calibrate confidence on dev data.
- [ ] Create failure analysis for confusing scenario pairs.
- [ ] Ensure UI is understandable without developer explanation.

## P2 — optional differentiation

- [ ] Hybrid fast/complex routing while preserving LLM final decision.
- [ ] Return to interrupted topic.
- [ ] Multi-intent queueing.
- [ ] Parameter extraction from speech.
- [ ] Streaming processing.
- [ ] Emotion/tone adaptation.
- [ ] Supervisor error statistics.
- [ ] Scenario catalog editor.

## Before submission

- [ ] Fresh clone test.
- [ ] One-command start test.
- [ ] Microphone permissions tested.
- [ ] No real secrets in repository.
- [ ] `.env.example` contains names only.
- [ ] No fake benchmark values.
- [ ] No hardcoded test-utterance mappings.
- [ ] README matches actual architecture.
- [ ] Demo script tested with live input.
- [ ] Final evaluation result recorded with command and timestamp.
