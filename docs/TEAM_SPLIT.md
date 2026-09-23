# Team split — two-computer execution plan

## North star

Get the highest possible score by first securing:

1. task compliance / working flow;
2. technical implementation;
3. README / reproducibility;

then improve product value and optional originality.

The project is judged on routing quality, not on flashy speech synthesis.

---

# Tim's computer — backend / integration owner

## Mission

Own the system's truth and decision-making layer.

Tim's computer is responsible for:

### Data / source truth
- load official starter-kit files;
- validate 40 scenarios + 3 system intents;
- preserve scenario IDs and official data;
- expose data through backend services without rewriting truth.

### Triage
- detect `ru` / `kk` / `mixed`;
- normalize speech-derived values;
- urgency signals;
- multi-intent splitting/order preparation.

### LLM Router
- structured prompt/context;
- `description`;
- `not_this_if`;
- examples;
- dialogue state;
- scenario boundaries;
- structured validated output;
- confidence policy;
- alternatives;
- continuation detection.

### Dialogue state
- active scenario;
- scenario stack;
- slots;
- client identity;
- low-confidence count;
- pending confirmation;
- handoff state.

### Scenario executor
- identification;
- missing-slot questions;
- action calls;
- error handling;
- preview/execute;
- irreversible-action confirmation;
- operator handoff.

### Knowledge grounding
- `knowledge_base.json`;
- `mock_backend.json`;
- action results;
- no invented Saqta facts.

### Server-side voice adapters
If external STT/TTS credentials or providers are server-side in the chosen architecture:
- STT adapter belongs to Tim;
- TTS adapter belongs to Tim;
- secrets remain server-side.

Danil still owns browser capture/playback.

### Evaluation
- prediction generation;
- `evaluate.py`;
- regression suite;
- failure analysis;
- measured accuracy;
- latency instrumentation.

### API / integration contract
Tim is final owner of:
- normalized turn input;
- normalized turn output;
- trace payload;
- clarification;
- handoff;
- confirmation flow.

### Git integration
Tim owns final merges into `main`.

---

# Danil's computer — frontend / voice UX owner

## Mission

Make every required capability visible, understandable, and usable by a judge without developer explanation.

Danil's computer is responsible for:

### Customer web surface
- microphone control;
- permission/error states;
- listening/recording states;
- live/returned transcript presentation;
- assistant messages;
- text fallback;
- conversation history.

### Browser audio
- microphone capture;
- audio transport to backend;
- response audio playback;
- playback/loading/error state.

Do not place secret provider credentials in the browser.

### Supervisor trace
After every user utterance render:
- transcript;
- language;
- selected scenario(s);
- confidence;
- concise reason;
- alternatives;
- slots;
- actions;
- stage latency;
- clarification state;
- handoff state.

### Product UX
- RU/KK/mixed content must not break layout;
- uncertainty must be visible;
- operator handoff must be visible;
- irreversible-action confirmation must be clear;
- UI must work without developer narration.

### Integration
- consume `.codex/INTEGRATION_CONTRACT.md`;
- build adapters around real backend payloads;
- do not invent endpoints;
- mock only behind a clear adapter while backend is unavailable;
- remove/disable fake data paths before submission.

### Frontend tests
At minimum:
- microphone permission failure;
- text fallback;
- normal turn rendering;
- trace rendering;
- multiple scenarios;
- clarification;
- handoff;
- confirmation preview;
- missing latency;
- server error;
- audio playback failure.

---

# Shared ownership boundaries

## Tim must not casually rewrite
- frontend component tree;
- CSS/design system;
- browser media implementation.

## Danil must not casually rewrite
- router prompts;
- scenario selection;
- evaluation labels;
- scenario executor;
- backend action logic;
- official starter-kit data.

## Shared files
Final owner: Tim/integrator unless explicitly handed off.

Examples:
- `README.md`
- root runtime scripts
- `.env.example`
- API contract
- shared types/schema

Danil proposes required shared changes through `.codex/DANIL_TO_TIM.md`.

---

# Integration milestones

## Milestone A — contract alive
Tim:
- backend can accept text;
- router returns structured trace.

Danil:
- UI can send text;
- UI renders trace.

Integration test:
- one real starter-kit utterance routes end-to-end.

## Milestone B — voice alive
Tim:
- STT/TTS service path or selected backend voice path works.

Danil:
- microphone capture works;
- voice response plays.

Integration test:
- microphone -> transcript -> route -> response -> audio.

## Milestone C — hard cases alive
Tim:
- confidence policy;
- multi-intent;
- continuation;
- topic switch;
- confirmation;
- handoff.

Danil:
- each state is clearly visible and usable.

Integration test:
- dialogue sample flows.

## Milestone D — evaluation/reproducibility
Tim:
- evaluation command;
- metrics;
- backend tests.

Danil:
- frontend checks/build.

Together:
- fresh-clone start;
- one-command demo;
- README updated.

## Milestone E — latency/polish
Only after A–D are working:
- optimize latency;
- optional fast path;
- animations/polish;
- supervisor statistics.
