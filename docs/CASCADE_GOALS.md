# Cascade goals

Use this hierarchy to prevent both agents from drifting.

# L0 — Project outcome

A judge speaks naturally into the web app and the system:
- understands RU/KK/mixed speech;
- selects the correct scenario through an LLM decision layer;
- keeps context;
- answers by voice;
- exposes an explainable trace;
- handles uncertainty safely;
- can be reproduced from the repository.

# L1 — Submission blockers

1. Real web microphone path.
2. Real LLM scenario routing.
3. 40 official scenario support.
4. Correct system intents.
5. RU/KK/mixed handling.
6. Trace after every turn.
7. Evaluation runs.
8. One-command launch.
9. README matches reality.

# L2 — Core system capabilities

Backend:
- triage;
- LLM routing;
- state;
- executor;
- KB/backend actions;
- safety;
- metrics.

Frontend:
- customer conversation;
- browser audio;
- trace;
- uncertainty;
- handoff;
- confirmation;
- error/loading states.

# L3 — Hard-case robustness

- `not_this_if`;
- close scenarios;
- multi-intent;
- urgent ordering;
- topic switching;
- continuation;
- operator handoff;
- confirmation.

# L4 — Scoring improvements

- latency;
- optional fast path;
- interrupted-topic return;
- better trace ergonomics;
- supervisor statistics;
- catalog editing only if core system is already safe.

# L5 — Goal loop for every Codex action

Every action must follow:

```text
READ TRUTH
  ↓
INSPECT CURRENT CODE
  ↓
STATE ONE TARGET
  ↓
IMPLEMENT SMALLEST COHERENT CHANGE
  ↓
RUN EVIDENCE / TEST
  ↓
UPDATE OWN MEMORY
  ↓
UPDATE HANDOFF IF NEEDED
  ↓
ATOMIC COMMIT
  ↓
PUSH
  ↓
SELECT NEXT TARGET
```

If a step cannot be evidenced, do not mark it done.
