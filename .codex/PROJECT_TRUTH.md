# Project truth

## Objective and ownership

Voice Router: LLM-based routing of the official synthetic Saqta Insurance scenarios, contextual RU/KK/mixed-language interaction and observable trace. Tim owns backend, API, provider integrations and final integration. Danil currently owns reference-driven UI design/layout and React controls. Do not replace his visual work with a second redesign.

The latest explicit user decision is OpenAI-only for routing, answer generation, STT and TTS. NVIDIA/provider assumptions in historical frontend notes are superseded by this decision.

## Source facts

The official starter kit defines 40 business scenarios and SYS_OUT_OF_SCOPE, SYS_UNCLEAR, SYS_GOODBYE, plus the 104-item development set. Preserve its IDs, exclusions, labels and synthetic data. Dataset-relative dates use its 2026-10-01 snapshot, not the real wall clock.

Use current code to establish what is implemented; use the official task and starter kit to establish what is required. A missing implementation does not weaken the task requirements. Claims of success require executed evidence.

## Current implementation

- FastAPI backend with a built-in functional jury page at /; Node is not required for this page.
- POST /v1/turn/text: LLM routing plus a separate read-only grounded answer from official knowledge_base.json and session history.
- OpenAI REST transport through HTTPX; no OpenAI SDK dependency is required by this path.
- POST /v1/audio/transcriptions, /v1/audio/speech, /v1/turn/audio.
- One server-only OPENAI_API_KEY. Configurable documented model defaults are in .env.example. The old unverified model default was replaced; quality is NOT yet benchmarked.
- Existing confidence thresholds retained; no baseline-driven tuning has occurred.
- Session transactions roll back failed text turns; history has at most ten turns.
- trace.actions=[] because insurance action execution is not implemented. A confirmation flag is not execution.
- No actual SMS, policy changes, appointments or operator connection. Do not claim those capabilities.

## Evidence and limits

This session executed 46 new backend unit/contract regressions and 16 standalone TypeScript audio-transport checks with explicit fixtures. It did not execute a live OpenAI request or the 104-item routing baseline. Browser navigation to the local server was blocked by the environment's Chromium policy. Full repository pytest and full React pnpm check are separate pending gates.

Do not treat fixture routing, authored tests, a pushed commit, an installed dependency or a mergeable PR as proof of a working live demo.

## Next gate

Run the full test suite on a complete authorized checkout; then live 3-item smoke + 104 predictions + original evaluate.py; record actual results. Test one successful and one failed browser request and microphone permission behavior. Only then integrate the verified milestone and tune routing from measured failures.
