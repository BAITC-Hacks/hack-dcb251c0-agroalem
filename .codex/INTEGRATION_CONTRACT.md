# Integration contract

This file is the shared interface between Tim/backend and Danil/frontend.

## Implemented text transport

### POST `/v1/turn/text`

Request:

```json
{
  "session_id": "string",
  "text": "user text"
}
```

Validation:
- `session_id`: 1..128 characters.
- `text`: 1..4000 characters.

Success response:

```json
{
  "session_id": "string",
  "turn": 1,
  "transcript": "string",
  "assistant_text": "string",
  "trace": {
    "language": "ru|kk|mixed|unknown",
    "scenarios": [
      {
        "scenario_id": "SC11",
        "confidence": 0.91,
        "reason": "short operational reason"
      }
    ],
    "alternatives": [
      {
        "scenario_id": "SC13",
        "confidence": 0.20
      }
    ],
    "slots": {},
    "actions": [],
    "is_continuation": false,
    "needs_clarification": false,
    "handoff": false,
    "requires_confirmation": false,
    "latency_ms": {
      "stt": null,
      "triage": null,
      "router": 123.4,
      "response": 0.3,
      "tts_first_audio": null,
      "total": 124.1
    }
  }
}
```

The numeric latency values above illustrate shape only. Production values must be measured by the backend.

## Current semantics

- Router decision is produced by the server-side OpenAI Responses API structured-output path.
- Scenario IDs are validated against the official starter-kit catalog.
- `actions` is currently always `[]` because scenario execution is not implemented yet. Configured scenario actions must not be shown as executed actions.
- `requires_confirmation` reflects the selected official scenario rule. It does not mean an irreversible action has already been executed.
- `router`, `response` and `total` latency are measured by backend code.
- STT and TTS are not part of the text endpoint, therefore `stt` and `tts_first_audio` remain `null`.
- Current session state is process-memory only: turn number, low-confidence streak, active scenario and up to 10 recent routing-history items.

## Decision policy

- confidence >= 0.75: accept route.
- confidence 0.45 to < 0.75: clarification.
- confidence < 0.45: clarification on first occurrence; handoff on the second consecutive low-confidence turn.
- explicit human-operator scenario with `handoff.when == "always"`: handoff.
- `SYS_OUT_OF_SCOPE` and `SYS_GOODBYE`: handled directly.

## Error behavior

- `422`: request validation failed.
- `503`: routing provider is not configured, including missing server-side credentials.
- `502`: provider request failed or no valid structured routing output was returned.
- `504`: routing provider timed out.

Frontend must render provider failures as failed turns, not fabricate a scenario/latency.

## Voice transport

Microphone/audio transport is still `UNKNOWN` and is not part of this target.

Do not invent:
- upload endpoint;
- MIME/codec requirements;
- streaming protocol;
- `assistant_audio` representation.

Those are added only when the STT/TTS server path exists.

## Contract rules

- `scenario_id` must come from real official scenario data.
- Confidence comes from the real routing result/policy; frontend does not recalculate it.
- Unknown latency is `null`.
- Rationale is a short operational explanation, never hidden chain-of-thought.
- Frontend never invokes irreversible mock-backend actions directly.
- Breaking changes require contract + owner state + outgoing handoff updates in the same target.
