# PROJECT_TRUTH.md — immutable project truth

This file is the shared source of truth for both Codex agents.

## Read order

At the beginning of EVERY Codex session, read in this order:

1. `AGENTS.md`
2. `.codex/PROJECT_TRUTH.md`
3. `.codex/INTEGRATION_CONTRACT.md`
4. your own state file:
   - Tim: `.codex/TIM_STATE.md`
   - Danil: `.codex/DANIL_STATE.md`
5. the incoming handoff file:
   - Tim reads `.codex/DANIL_TO_TIM.md`
   - Danil reads `.codex/TIM_TO_DANIL.md`
6. `TASKS.md`
7. relevant source files and tests

Do not rely on conversational memory when repository files can answer the question.

---

# 1. Official case

Project: **Voice Router**

Task: build a hybrid voice AI bot with an **LLM scenario-selection layer** for a contact-center simulation.

Primary goal: routing quality under natural speech.

The product must accept real user input, use an LLM at the substantive decision point, return an explainable result, and operate on real starter-kit data rather than a recorded/hardcoded demo.

Current team decision, confirmed on 2026-09-23: use the OpenAI API as the initial LLM provider. The exact model remains `UNKNOWN` until it is implemented and evaluated.

---

# 2. Mandatory user-facing behavior

The web product must support:

- live microphone input;
- speech recognition;
- spoken response;
- text as a fallback/additional channel;
- Russian;
- Kazakh;
- mixed-language speech;
- dialogue context;
- supervisor tracing after every user utterance.

The supervisor trace must show at least:

- transcript;
- language;
- selected scenario(s);
- confidence;
- short operational reason;
- alternatives;
- slots when relevant;
- actions when relevant;
- latency by stage.

Do not expose hidden chain-of-thought.

---

# 3. Official starter-kit facts

Dataset company: **Saqta Insurance** (fictional).

Dataset snapshot date: **2026-10-01**.

Treat `2026-10-01` as "today" for all relative-date interpretation in the dataset.

The starter kit contains:

- `scenarios.json`
- `slots.json`
- `actions.json`
- `knowledge_base.json`
- `mock_backend.json`
- `dialogs_sample.json`
- `dev_utterances.json`
- `evaluate.py`
- dataset README files

There are:

- 40 business scenarios: `SC01`…`SC40`
- 3 system intents:
  - `SYS_OUT_OF_SCOPE`
  - `SYS_UNCLEAR`
  - `SYS_GOODBYE`
- 104 dev utterances:
  - 84 single-intent
  - 13 multi-intent
  - 4 out-of-scope
  - 3 unclear
  - 7 mixed-language utterances

Do not invent additional official scenarios or relabel existing ones.

---

# 4. Routing rules from the starter kit

Use the actual `scenarios.json` fields.

Important fields include:

- `scenario_id`
- `description`
- `not_this_if`
- `priority`
- `fast_path_eligible`
- `requires_identification`
- `slots.required`
- `slots.optional`
- `actions`
- `requires_confirmation`
- `handoff`
- `examples`
- `responses`

`not_this_if` is a critical negative boundary signal.
Do not route only from positive examples.

Priorities:

- `normal`
- `high`
- `urgent`

Official urgent business scenarios are determined by the current `scenarios.json`.
At the starter-kit snapshot they include urgent situations such as immediate road accidents, medical incidents abroad, and suspected fraud.

When multiple intents are detected:

1. urgent scenario first;
2. then the remaining scenarios in order of mention;
3. acknowledge that the remaining issues will also be handled.

Continuation rule:

- if the user is continuing the active scenario, fill slots / continue the scenario;
- do NOT rerun full scenario routing unnecessarily.

Topic change rule:

- preserve the interrupted scenario in dialogue state/stack;
- handle the new topic;
- offer to return to the interrupted topic afterwards.

---

# 5. Official router output shape

The starter-kit reference architecture expects a structured LLM router result conceptually like:

```json
{
  "scenarios": [
    {
      "scenario_id": "SC30",
      "confidence": 0.86,
      "reason": "short operational reason"
    }
  ],
  "alternatives": [
    {
      "scenario_id": "SC26",
      "confidence": 0.31
    }
  ],
  "language": "ru",
  "slots": {},
  "is_continuation": false
}
```

Implementation may extend this schema, but must preserve the core information needed by evaluation and trace UI.

All model output must be validated.

Unknown scenario IDs must be rejected, not accepted or invented.

---

# 6. Official decision policy

Reference policy from the starter kit:

- `confidence >= 0.75`
  - launch the scenario;
- `0.45 <= confidence < 0.75`
  - use `SYS_UNCLEAR`;
  - ask ONE short clarification question using the two most likely options;
- `confidence < 0.45` twice in a row
  - hand off to an operator with context;
- explicit user request for a human operator
  - hand off with context.

Do not silently change these thresholds without:
1. measuring the dev set;
2. documenting the evidence;
3. recording the decision in the owning agent state file.

---

# 7. Scenario execution

Scenario executor behavior:

1. identify client when required;
2. fill missing slots one at a time;
3. normalize spoken values;
4. call actions from `actions.json`;
5. for irreversible actions:
   - preview the action;
   - repeat the key data;
   - obtain explicit "yes" confirmation;
   - only then execute;
6. handle action errors according to official error handling;
7. close the scenario;
8. return to an interrupted scenario if applicable.

Do not invent backend facts or actions.

---

# 8. Knowledge grounding

Customer-facing factual answers about Saqta Insurance must be grounded in:

- `knowledge_base.json`
- `mock_backend.json`
- action results
- current scenario and collected slots

Do not use general insurance knowledge to fill missing company facts.

If the official data does not contain an answer:
- say the data is unavailable;
- clarify or hand off when appropriate.

---

# 9. Language behavior

Language values:

- `ru`
- `kk`
- `mixed`

Respond in the customer's predominant language and switch when the customer switches.

Do not translate scenario IDs or mutate official slot/action names.

---

# 10. Voice response style from starter kit

Customer response style:

- 1–2 short sentences per turn;
- one question at a time;
- first acknowledge, then act;
- calm/fast behavior for urgent situations;
- empathetic wording for claims/complaints;
- speak numbers naturally;
- mask personal data when repeating it;
- answer honestly if asked whether the agent is a robot;
- operator handoff includes a concise context summary.

---

# 11. Evaluation truth

Official local evaluation:

```bash
python starter-kit/evaluate.py predictions.json starter-kit/dev_utterances.json
```

Predictions format:

```json
{
  "U001": ["SC01"],
  "U085": ["SC27", "SC04"]
}
```

Metrics include:

- primary accuracy;
- full match;
- multi-intent recall;
- breakdown by language;
- breakdown by utterance type.

Never report a metric unless the command was actually run against the current code/predictions.

The jury uses a different hidden set of the same general types.

Never hardcode visible dev utterances or guessed hidden phrases.

---

# 12. Latency truth

Official bonus target:

- route selection: approximately 500 ms target;
- end of speech -> start of response:
  - <= 1.5 s: strongest bonus tier;
  - <= 3 s: lower bonus tier;
  - > 3 s: no latency bonus.

Latency is measured and must not be fabricated.

Routing quality remains the primary goal.

---

# 13. Forbidden architecture

Never use an encoder intent classifier as the final scenario-selection layer.

Never implement:

- hardcoded phrase -> scenario mappings;
- visible test phrase special cases;
- hidden-test guesses;
- a prerecorded one-path demo;
- fake backend processing;
- fake latency;
- real customer PII;
- real call recordings;
- irreversible actions without confirmation.

A retrieval/rule/triage component may prepare context or candidates.
The substantive routing decision must remain LLM-based unless the starter kit explicitly permits an optional fast path for an eligible scenario.

---

# 14. Anti-hallucination protocol

For every nontrivial claim or implementation decision, use this evidence order:

1. actual repository code;
2. official starter-kit files;
3. official case/TZ documents;
4. previously committed project decisions;
5. only then an explicit engineering inference.

If evidence is absent:

- DO NOT invent;
- write `UNKNOWN` or `BLOCKED`;
- identify the file/data required to resolve it;
- continue with work that does not depend on the unknown.

Do not invent:
- API endpoints already supposedly existing;
- model/provider names;
- environment variables;
- framework choices;
- benchmark numbers;
- scenario IDs;
- action results;
- company facts;
- test outcomes.

Before saying "implemented", "working", "passing", or giving a number:
run the relevant command or inspect the relevant runtime evidence.
