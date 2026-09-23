# AGENTS.md

## Project
Voice Router — hybrid voice AI bot with an LLM-based scenario-selection layer for HackAlem AI / Halyk Bank.

This file is the highest-priority project instruction for Codex and any coding agent working in this repository.

## Team workflow

- Tim owns backend work on `tim/backend`; read `prompts/TIM_MASTER_PROMPT.md` and `.codex/TIM_STATE.md`.
- Danil owns frontend work on `danil/frontend`; read `prompts/DANIL_MASTER_PROMPT.md` and `.codex/DANIL_STATE.md`.
- Tim owns integration into `main`.
- Shared contract changes require review from both roles.
- After every completed target action, follow `.codex/COMMIT_PROTOCOL.md`, update the role state, commit atomically, and push the assigned branch.
- Project memory lives in committed `.codex/` files. Chat history is not authoritative unless the outcome is recorded in Git.

---

## 1. Mission

Build a working voice AI bot with a web simulation interface that:

1. accepts live user speech from a browser microphone;
2. transcribes speech;
3. uses an LLM at the substantive decision point to select the correct conversation scenario;
4. keeps dialogue context across turns;
5. supports Russian and Kazakh, including mixed-language speech;
6. produces a user-facing response, including voice output;
7. shows a supervisor trace after every user utterance:
   - transcript,
   - selected scenario,
   - concise rationale,
   - alternatives,
   - latency by stage;
8. expresses uncertainty instead of pretending to know;
9. asks for clarification or hands off to an operator when it cannot safely resolve the request;
10. never performs irreversible actions without explicit customer confirmation.

The core problem is ROUTING QUALITY.
STT and TTS are necessary product components, but this project is not a speech-model competition.

---

## 2. Source of truth

Use the HackAlem / Halyk Bank Voice Router task specification and the official starter kit as the source of truth.

Expected starter-kit assets include:

- `scenarios.json` — 40 original scenarios;
- `dialogs_sample.json` — annotated dialogues;
- `knowledge_base.json` — company facts;
- `mock_backend.json` — synthetic customer/backend data;
- `dev_utterances.json` — labeled development utterances;
- `evaluate.py` — local routing evaluation script.

Do not silently replace official data with invented structures.

If the repository's actual starter-kit schema differs from assumptions in this file:
1. inspect the real files;
2. adapt implementation to the real schema;
3. update documentation;
4. do not rewrite the dataset merely to make the code easier.

Evaluation is based on the original 40 scenarios even if custom scenarios are added.

---

## 3. Non-negotiable hackathon requirements

The implementation is not acceptable unless all of the following are true.

### Voice interaction
- Microphone input works in the web UI.
- The system recognizes live speech.
- The system responds with voice.
- Text input may exist only as a fallback/additional channel.

### LLM-based routing
- Scenario selection is performed by an LLM layer.
- An encoder-style intent classifier must NOT be the final routing mechanism.
- An embedding/retrieval/rule component may only narrow candidates or optimize latency.
- The final substantive routing decision must still be made by the LLM.

### Routing correctness
The router must be designed for:
- straightforward utterances;
- topic changes;
- requests near scenario boundaries;
- Russian;
- Kazakh;
- code-switching / mixed-language speech;
- dialogue context up to 10 turns.

### Traceability
After every user utterance, the supervisor UI must display:
- transcript;
- selected scenario;
- concise evidence-based rationale;
- alternatives;
- stage-by-stage latency.

Do not expose hidden chain-of-thought.
Provide a short operational explanation, such as:
- matched facts/signals;
- relevant context;
- ambiguity;
- why an alternative was rejected at a high level.

### Uncertainty
- AI is not the sole source of truth.
- Where confidence is low, expose uncertainty.
- Prefer clarification over confident guessing.
- Hand off to an operator when the system cannot resolve the request.

### Safety
- Never perform an irreversible action without explicit customer confirmation.
- Use only synthetic/anonymized data supplied for the task.
- Do not introduce real call recordings or real customer PII into the project.

### Infrastructure
- The complete project must be launchable with ONE documented command.
- README must contain exact setup and run instructions.

---

## 4. Explicitly forbidden approaches

Do NOT:

- use an off-the-shelf encoder intent classifier as the routing decision layer;
- hardcode mappings from known/test utterances to scenario IDs;
- build a demo that only works for one prepared script;
- fake data processing;
- hide the routing decision inside an unexplained black box;
- send irreversible backend actions without confirmation;
- use real customer recordings or real personal data;
- optimize TTS/STT quality at the expense of routing correctness;
- introduce large infrastructure that does not improve the demo or scoring.

If an implementation could be interpreted as "the classifier makes the decision and the LLM only writes text", it violates the task.

---

## 5. Product users

### Customer
The customer should be able to:
1. speak naturally;
2. switch topic;
3. switch between Russian and Kazakh;
4. receive the correct scenario response;
5. be asked a clarification question when necessary;
6. be transferred to an operator with context when the system cannot resolve the issue.

### Supervisor
The supervisor should be able to see:
- current conversation;
- per-turn transcript;
- selected scenario;
- alternatives;
- confidence/uncertainty;
- concise rationale;
- routing latency;
- STT / routing / response / TTS timing when available;
- operator handoff events.

The UI must be understandable without developer narration.

---

## 6. Architecture principles

Prefer the smallest architecture that satisfies the task.

Recommended logical flow:

Browser microphone
→ STT
→ Dialogue state
→ Scenario candidate preparation
→ LLM Router
→ Routing policy / confidence gate
→ Scenario executor
→ Knowledge base / mock backend
→ Response generation
→ TTS
→ Browser playback

In parallel:

Every stage
→ Telemetry / trace
→ Supervisor panel

### Important rule
Candidate retrieval is allowed as an optimization, but it must not become the actual intent classifier.

A safe pattern:

1. use scenario metadata, boundaries, conversation state, and optional retrieval to prepare a small candidate set;
2. give the LLM enough structured context to choose;
3. require structured output;
4. apply a deterministic policy for uncertainty, confirmation, and handoff;
5. log the result.

---

## 7. LLM router contract

The router should return structured data, not free-form prose.

Prefer a schema conceptually similar to:

```json
{
  "selected_scenario_id": "string | null",
  "confidence": 0.0,
  "alternatives": [
    {
      "scenario_id": "string",
      "confidence": 0.0,
      "reason": "short explanation"
    }
  ],
  "rationale": "short operational explanation",
  "needs_clarification": false,
  "clarification_question": null,
  "needs_operator": false,
  "detected_language": "ru|kk|mixed|other",
  "extracted_parameters": {}
}
```

Adapt field names to the actual project and starter-kit schema.

Requirements:
- validate all model output;
- never trust malformed JSON;
- enforce known scenario IDs;
- allow `null` / uncertainty;
- never fabricate scenario IDs;
- keep rationale concise;
- do not request or reveal chain-of-thought.

---

## 8. Dialogue state

The router must consider conversation context, not only the latest utterance.

Store at minimum:
- recent turns;
- active scenario;
- previous scenario(s);
- unresolved questions;
- extracted parameters;
- pending confirmation;
- operator handoff state.

Design for up to 10 turns.

When topic changes:
- do not erase prior context blindly;
- route the new request;
- preserve enough state to return to the interrupted issue if appropriate.

For a single utterance containing two issues:
- detect that it may contain multiple intents;
- choose a deterministic product behavior:
  - handle the primary issue and queue the secondary one, or
  - explicitly ask which issue to handle first;
- document this behavior and test it.

---

## 9. Scenario boundaries

Scenario metadata is critical.

When `scenarios.json` contains:
- purpose,
- boundaries,
- neighboring scenarios,
- negative examples,
- required parameters,
- available actions,
- example utterances,

use those fields in routing.

Do not route solely from positive examples.

When two scenarios are close:
- compare their boundary conditions;
- surface the nearest alternatives;
- lower confidence when evidence is insufficient;
- ask a clarification question rather than guessing.

---

## 10. Latency

Performance earns additional value and is visible in the UI.

Targets from the task:
- scenario selection target: approximately 500 ms;
- end of user utterance → beginning of response target: approximately 1.5 s.

These are targets, not reasons to hide slower measurements.

Measure at minimum:
- STT latency;
- router preparation latency;
- LLM routing latency;
- scenario/backend latency;
- response generation latency;
- TTS start latency;
- total end-to-response-start latency.

Use monotonic timers where possible.

Do not invent timing values.
If a stage is unavailable, show it as unavailable.

Optimize only after the correct flow works.

---

## 11. Routing optimization strategy

Priority:
1. accuracy;
2. robustness on topic changes and scenario boundaries;
3. RU/KK/mixed-language behavior;
4. explainability;
5. uncertainty handling;
6. latency.

Possible optimizations:
- compact scenario representation;
- candidate shortlist before LLM routing;
- prompt caching where supported;
- structured output;
- small/fast LLM for easy routes;
- stronger fallback LLM for ambiguous routes;
- parallelizable non-dependent stages;
- streaming STT/TTS if practical.

A hybrid fast path is acceptable only if the fast path does not violate the LLM-routing requirement.

---

## 12. Evaluation discipline

The hidden jury test contains 10 utterances.
Do not optimize to guessed hidden phrases.

Use the provided development data and `evaluate.py`.

For every routing change:

1. run existing tests;
2. run `evaluate.py` if available;
3. record routing accuracy;
4. inspect regressions by scenario;
5. inspect confusing scenario pairs;
6. inspect RU / KK / mixed-language cases;
7. inspect topic-change cases;
8. inspect low-confidence behavior;
9. keep the better implementation based on measured results.

Never claim an accuracy number that was not produced by an actual run.

Create reproducible evaluation commands and document them in README.

---

## 13. Required testing

At minimum, add automated tests for:

- valid scenario ID output;
- malformed LLM output;
- low-confidence result;
- clarification flow;
- operator handoff flow;
- irreversible-action confirmation;
- Russian utterance;
- Kazakh utterance;
- mixed RU/KK utterance;
- topic switch;
- close/boundary scenario;
- context-dependent follow-up;
- backend/knowledge lookup;
- latency trace fields;
- text fallback path.

Use starter-kit examples wherever possible.

---

## 14. UI requirements

The web app should have two clear surfaces.

### Customer surface
- microphone control;
- listening/transcribing state;
- transcript;
- assistant response;
- audio playback state;
- text fallback.

### Supervisor surface
For each turn:
- input transcript;
- chosen scenario;
- short rationale;
- alternatives;
- confidence/uncertainty;
- timing by stage;
- clarification/handoff status.

Make uncertainty obvious.

Do not bury routing details in browser dev tools.

---

## 15. One-command launch

The final repository must have one canonical command that launches the complete demo.

Choose the lightest approach suitable for the actual stack.

Examples of acceptable patterns:
- a single package script;
- a Make target;
- Docker Compose;
- a small top-level launcher script.

Do not create multiple competing startup paths.

README must document:
- prerequisites;
- environment variables;
- one setup flow;
- one run command;
- one evaluation command.

---

## 16. README is part of the score

README/reproducibility carries 25 points, so treat documentation as production work.

Keep README synchronized with the actual implementation.

Never document features that do not exist.

Never leave fake benchmark numbers.

Never leave placeholder setup commands at submission time.

---

## 17. Judging priorities

Optimize work against the official 100-point structure:

1. Task compliance and working main scenario — 25
2. Technical implementation — 25
3. README and reproducibility — 25
4. Value and applicability — 15
5. Development potential and originality — 10

When deciding between two tasks, prefer the one that improves one of the first three categories.

---

## 18. Definition of done

The project is submission-ready only when:

- [ ] live browser microphone input works;
- [ ] text fallback works;
- [ ] live speech is transcribed;
- [ ] LLM performs substantive scenario selection;
- [ ] all original scenario IDs can be routed;
- [ ] Russian works;
- [ ] Kazakh works;
- [ ] mixed-language speech is handled;
- [ ] context survives topic changes;
- [ ] uncertainty is visible;
- [ ] clarification works;
- [ ] operator handoff works;
- [ ] irreversible actions require confirmation;
- [ ] voice response works;
- [ ] trace panel updates after every turn;
- [ ] alternatives are shown;
- [ ] per-stage latency is real and visible;
- [ ] official local evaluation runs;
- [ ] no hidden-utterance hardcoding exists;
- [ ] project starts with one documented command;
- [ ] README matches reality.

---

## 19. Codex working protocol

Before changing code:

1. read this `AGENTS.md`;
2. inspect repository structure;
3. inspect the starter-kit README and JSON schemas;
4. inspect `evaluate.py`;
5. run the current tests/evaluation if possible;
6. identify the smallest change that moves the project toward Definition of Done.

While coding:
- make focused changes;
- preserve working behavior;
- prefer typed/validated boundaries;
- log real timings;
- keep LLM output structured;
- avoid speculative abstractions;
- do not add dependencies without a concrete reason.

After coding:
1. run relevant tests;
2. run evaluation if routing changed;
3. verify the demo flow;
4. update README/docs when behavior changed;
5. summarize:
   - what changed,
   - why,
   - tests/evaluation run,
   - remaining risk.

If a requested change conflicts with this task specification, preserve the specification and explain the conflict.
