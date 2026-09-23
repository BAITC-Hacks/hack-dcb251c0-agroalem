# Integration contract

This is a domain contract, not a claim about a concrete HTTP/WebSocket endpoint. Transport, route names and framework remain `UNKNOWN` until verified in code.

## Turn response shape

    {
      "session_id": "...",
      "turn": 3,
      "transcript": "...",
      "assistant_text": "...",
      "trace": {
        "language": "ru|kk|mixed|unknown",
        "scenarios": [
          {"scenario_id": "SCxx", "confidence": 0.9, "reason": "..."}
        ],
        "alternatives": [
          {"scenario_id": "SCyy", "confidence": 0.4}
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
          "router": null,
          "response": null,
          "tts_first_audio": null,
          "total": null
        }
      }
    }

## Contract rules
- `scenario_id` must come from real scenario data.
- Confidence comes from real routing result/policy; frontend does not recalculate it.
- Unknown latency is `null`, never a plausible-looking number.
- Irreversible action execution requires confirmation when scenario rules require it.
- `handoff=true` exposes operator handoff UX.
- `needs_clarification=true` exposes clarification state and alternatives.

## Change protocol
Any breaking change requires in the same target:
1. update this file;
2. update the owner's STATE;
3. update outgoing handoff.

Concrete endpoint/transport/provider fields remain absent until verified.
