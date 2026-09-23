# Architecture

## Design goal

Deliver reliable contextual scenario routing with an LLM while preserving low latency and full traceability.

## Recommended component model

```text
[Browser]
  microphone / text fallback
       |
       v
[STT Adapter]
       |
       v
[Conversation State]
       |
       +-----------------------+
       |                       |
       v                       |
[Scenario Context Builder]     |
       |                       |
       v                       |
[LLM Router]                   |
       |                       |
       v                       |
[Decision Policy]              |
  |        |        |          |
  |        |        +--> operator handoff
  |        +----------> clarification
  v
[Scenario Executor]
  |           |
  v           v
[KB]     [Mock Backend]
  \           /
   \         /
    v       v
 [Response Builder]
       |
       v
 [TTS Adapter]
       |
       v
 [Browser Audio]

All components -> [Trace / Metrics] -> [Supervisor UI]
```

## Why this architecture

The LLM remains the substantive decision layer.

Deterministic code is used for:
- validation;
- safety;
- confirmation requirements;
- known scenario ID enforcement;
- handoff policy;
- latency measurement;
- backend execution.

This prevents the application from becoming either:
- a black-box LLM call, or
- a hidden classical intent-classifier with an LLM added only for presentation.

## Scenario context builder

Build a compact prompt/context from the official scenario catalog.

Include only fields actually present in the data, for example:
- scenario ID;
- purpose;
- boundaries;
- neighbors;
- required parameters;
- actions;
- examples.

If scenario retrieval is used:
- retrieval may shortlist candidates;
- final route must still be made by the LLM;
- keep a fallback path that can reconsider the shortlist when confidence is weak.

## Conversation state

Persist enough state for a dialogue of up to 10 turns.

Suggested state:

```json
{
  "turns": [],
  "active_scenario_id": null,
  "scenario_history": [],
  "pending_question": null,
  "pending_confirmation": null,
  "extracted_parameters": {},
  "handoff": false
}
```

Do not add fields until they are used.

## Router output

Use a strict structured schema.

Key properties:
- selected scenario ID or null;
- confidence;
- alternative scenarios;
- short rationale;
- clarification flag/question;
- operator flag;
- language;
- extracted parameters.

Validate at the application boundary.

## Explainability

Do not expose hidden model reasoning.

Show:
- short routing reason;
- important signals;
- ambiguity;
- closest alternatives;
- confidence.

Example:

```text
Selected: PAYMENT_NOT_CONFIRMED
Reason: user reports completed payment and missing confirmation.
Alternative: CHANGE_DELIVERY_ADDRESS
Ambiguity: the same utterance also contains an address-change request.
```

## Multi-intent / topic switch

The specification includes natural speech where one utterance may contain a second issue.

Recommended policy:
- identify the primary scenario;
- preserve secondary issue in conversation state;
- finish or clarify the primary issue;
- explicitly return to the queued issue.

If product behavior differs, document it and test it.

## Uncertainty policy

Do not guess.

Recommended logical states:

```text
HIGH confidence
  -> route

MEDIUM confidence
  -> route only when scenario boundary is sufficiently clear
  -> otherwise ask clarification

LOW confidence
  -> ask clarification or operator handoff
```

Exact numeric thresholds must be derived from real dev-set evaluation.
Do not invent thresholds before measurement.

## Irreversible actions

Use a two-step pattern:

```text
route / gather parameters
        |
        v
show proposed action
        |
        v
explicit customer confirmation
        |
        v
execute mock backend action
```

## Latency instrumentation

Record timestamps around each real stage.

Suggested trace model:

```json
{
  "stt_ms": 0,
  "context_ms": 0,
  "routing_ms": 0,
  "backend_ms": 0,
  "response_ms": 0,
  "tts_start_ms": 0,
  "end_to_response_start_ms": 0
}
```

Do not populate fields that cannot be measured.

## Performance strategy

First make routing correct.

Then test:
- shorter structured prompts;
- fewer candidate scenarios;
- caching static scenario descriptions;
- fast LLM for clear routes;
- stronger LLM fallback for ambiguity;
- streaming where it improves real end-to-end time.

Any fast path must preserve the LLM-based substantive decision requirement.

## Deployment / launch

Prefer a minimal one-command launch mechanism supported by the real stack.

Do not add Docker solely for appearances if one package script is enough.
Do not add multiple services unless the architecture truly needs them.
